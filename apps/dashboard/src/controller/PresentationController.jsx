import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DISPLAY_ID, findDisplay, PRESENTATION_DISPLAYS } from "../config/displayRegistry";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { createPresentationCommand, PRESENTATION_COMMANDS } from "./presentationCommands";
import { createWebSocketPresentationTransport } from "./presentationTransport";
import { RUNTIME_SETTINGS } from "../config/runtimeSettings";

const PresentationControllerContext = createContext(null);
const slideCount = PRESENTATION_SLIDES.length;
const FALLBACK_POLL_MS = 2000;
const HEARTBEAT_MS = 3000;
function slideStorageKey(displayId){return `grmetro.presentation.${displayId}.slideIndex`;}
function rememberedSlideIndex(displayId){try{const value=Number(window.sessionStorage.getItem(slideStorageKey(displayId)));return Number.isInteger(value)&&value>=0&&value<slideCount?value:0;}catch{return 0;}}
function rememberSlideIndex(displayId,index){if(!Number.isInteger(index)||index<0)return;try{window.sessionStorage.setItem(slideStorageKey(displayId),String(index%slideCount));}catch{/* optional */}}
export function PresentationControllerProvider({children}){return <PresentationControllerContext.Provider value={true}>{children}</PresentationControllerContext.Provider>;}

export function usePresentationController(requestedDisplayId=DEFAULT_DISPLAY_ID,clientType="display"){
  if(!useContext(PresentationControllerContext))throw new Error("usePresentationController must be used within PresentationControllerProvider");
  const displayId=findDisplay(requestedDisplayId)?.id??DEFAULT_DISPLAY_ID;const display=findDisplay(displayId);
  const [state,setState]=useState(()=>({displayId,displayName:display.name,presentationProfile:display.presentationProfile,activeSlideIndex:rememberedSlideIndex(displayId),isRunning:true,timerRevision:0,lastUpdated:null}));
  const [transportConnectionState,setTransportConnectionState]=useState("connecting");const [targetDisplayOnline,setTargetDisplayOnline]=useState(clientType!=="remote");const [transport,setTransport]=useState(null);const [runtime,setRuntime]=useState({reconnectCount:0,lastSynchronization:null});
  const acceptState=useCallback((nextState)=>{if(!nextState||nextState.displayId!==displayId)return;rememberSlideIndex(displayId,nextState.activeSlideIndex);setState(nextState);setRuntime(current=>({...current,lastSynchronization:Date.now()}));},[displayId]);

  useEffect(()=>{setState(current=>({...current,displayId,displayName:display.name,presentationProfile:display.presentationProfile,activeSlideIndex:current.displayId===displayId?current.activeSlideIndex:rememberedSlideIndex(displayId)}));const nextTransport=createWebSocketPresentationTransport({displayId,clientType,reconnectMinimumMs:RUNTIME_SETTINGS.reconnectMinimumMs,reconnectMaximumMs:RUNTIME_SETTINGS.reconnectMaximumMs,onState:acceptState,onConnectionChange:setTransportConnectionState,onReconnectAttempt:()=>setRuntime(current=>({...current,reconnectCount:current.reconnectCount+1}))});setTransport(nextTransport);return()=>nextTransport.close();},[acceptState,clientType,display.name,display.presentationProfile,displayId]);

  useEffect(()=>{let active=true;const sync=async()=>{try{const response=await fetch(`/api/v1/presentation/${encodeURIComponent(displayId)}`,{cache:"no-store"});if(!response.ok)throw new Error("presentation unavailable");const payload=await response.json();if(!active)return;acceptState(payload.state);if(clientType==="remote")setTargetDisplayOnline(Boolean(payload.online));}catch{if(active&&clientType==="remote")setTargetDisplayOnline(false);}};sync();const timer=window.setInterval(sync,FALLBACK_POLL_MS);return()=>{active=false;window.clearInterval(timer);};},[acceptState,clientType,displayId]);

  // Only a real dashboard display sends presence heartbeats. This is the source of truth
  // for the remote's Online/Offline status; phones/remotes never call this endpoint.
  useEffect(()=>{if(clientType!=="display")return undefined;let active=true;const beat=async()=>{if(!active)return;try{await fetch(`/api/v1/presentation/${encodeURIComponent(displayId)}/heartbeat`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",cache:"no-store"});}catch{/* next heartbeat retries */}};beat();const timer=window.setInterval(beat,HEARTBEAT_MS);return()=>{active=false;window.clearInterval(timer);};},[clientType,displayId]);

  useEffect(()=>{rememberSlideIndex(displayId,state.activeSlideIndex);},[displayId,state.activeSlideIndex]);

  // HTTP is the authoritative command path. Previously optional chaining made a missing/not-yet-open
  // WebSocket look like a successful send, so the fallback never ran and remote buttons did nothing.
  // The WebSocket remains for instant state broadcasts/reconnects; commands themselves are guaranteed
  // to reach the same backend presentation manager through this request.
  const send=useCallback(async(type,payload)=>{const command=createPresentationCommand(type,displayId,payload);const response=await fetch(`/api/v1/presentation/${encodeURIComponent(displayId)}/command`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(command),cache:"no-store"});if(!response.ok)throw new Error("Presentation command failed.");const result=await response.json();acceptState(result.state);},[acceptState,displayId]);
  const connectionState=clientType==="remote"?(targetDisplayOnline?"connected":"offline"):transportConnectionState;
  return useMemo(()=>({...state,...runtime,connectionState,targetDisplayOnline,activeSlide:PRESENTATION_SLIDES[state.activeSlideIndex%slideCount],displays:PRESENTATION_DISPLAYS,slides:PRESENTATION_SLIDES,nextSlide:()=>send(PRESENTATION_COMMANDS.NEXT_SLIDE),pauseRotation:()=>send(PRESENTATION_COMMANDS.PAUSE_ROTATION),previousSlide:()=>send(PRESENTATION_COMMANDS.PREVIOUS_SLIDE),restartRotationTimer:()=>send(PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER),resumeRotation:()=>send(PRESENTATION_COMMANDS.RESUME_ROTATION),selectSlide:(index)=>send(PRESENTATION_COMMANDS.GO_TO_SLIDE,{index}),setRuntimePaused:()=>{},reconnect:()=>transport?.reconnect()}),[connectionState,runtime,send,state,targetDisplayOnline,transport]);
}
