import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DISPLAY_ID, findDisplay, PRESENTATION_DISPLAYS } from "../config/displayRegistry";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { createWebSocketPresentationTransport } from "./presentationTransport";
import { RUNTIME_SETTINGS } from "../config/runtimeSettings";

const PresentationControllerContext = createContext(null);
const slideCount = PRESENTATION_SLIDES.length;
const FALLBACK_POLL_MS = 1000;
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

  useEffect(()=>{let active=true;const sync=async()=>{try{const response=await fetch(`/api/v1/presentation/${encodeURIComponent(displayId)}?t=${Date.now()}`,{cache:"no-store"});if(!response.ok)throw new Error("presentation unavailable");const payload=await response.json();if(!active)return;acceptState(payload.state);if(clientType==="remote")setTargetDisplayOnline(Boolean(payload.online));}catch{if(active&&clientType==="remote")setTargetDisplayOnline(false);}};sync();const timer=window.setInterval(sync,FALLBACK_POLL_MS);return()=>{active=false;window.clearInterval(timer);};},[acceptState,clientType,displayId]);

  useEffect(()=>{if(clientType!=="display")return undefined;let active=true;const beat=async()=>{if(!active)return;try{await fetch(`/api/v1/presentation/${encodeURIComponent(displayId)}/heartbeat?t=${Date.now()}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",cache:"no-store"});}catch{/* next heartbeat retries */}};beat();const timer=window.setInterval(beat,HEARTBEAT_MS);return()=>{active=false;window.clearInterval(timer);};},[clientType,displayId]);
  useEffect(()=>{rememberSlideIndex(displayId,state.activeSlideIndex);},[displayId,state.activeSlideIndex]);

  const action=useCallback(async(name,payload={})=>{
    // Update immediately so a button/arrow visibly responds even before the network round trip.
    setState(current=>{
      if(name==="next")return {...current,activeSlideIndex:(current.activeSlideIndex+1)%slideCount};
      if(name==="previous")return {...current,activeSlideIndex:(current.activeSlideIndex-1+slideCount)%slideCount};
      if(name==="select"&&Number.isInteger(payload.index))return {...current,activeSlideIndex:payload.index};
      if(name==="pause")return {...current,isRunning:false};
      if(name==="resume")return {...current,isRunning:true};
      if(name==="restart")return {...current,activeSlideIndex:0,isRunning:true};
      return current;
    });
    const response=await fetch(`/api/v1/presentation/${encodeURIComponent(displayId)}/action/${name}?t=${Date.now()}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
    if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`Presentation action ${name} failed (${response.status}) ${detail}`);}
    const result=await response.json();acceptState(result.state);
    return result.state;
  },[acceptState,displayId]);

  const connectionState=clientType==="remote"?(targetDisplayOnline?"connected":"offline"):transportConnectionState;
  return useMemo(()=>({...state,...runtime,connectionState,targetDisplayOnline,activeSlide:PRESENTATION_SLIDES[state.activeSlideIndex%slideCount],displays:PRESENTATION_DISPLAYS,slides:PRESENTATION_SLIDES,nextSlide:()=>action("next"),pauseRotation:()=>action("pause"),previousSlide:()=>action("previous"),restartRotationTimer:()=>action("restart"),resumeRotation:()=>action("resume"),selectSlide:(index)=>action("select",{index}),setRuntimePaused:()=>{},reconnect:()=>transport?.reconnect()}),[action,connectionState,runtime,state,targetDisplayOnline,transport]);
}
