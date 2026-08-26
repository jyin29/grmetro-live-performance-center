import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DISPLAY_ID, findDisplay, PRESENTATION_DISPLAYS } from "../config/displayRegistry";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { createPresentationCommand, PRESENTATION_COMMANDS } from "./presentationCommands";
import { createWebSocketPresentationTransport } from "./presentationTransport";
import { RUNTIME_SETTINGS } from "../config/runtimeSettings";

const PresentationControllerContext = createContext(null);
const slideCount = PRESENTATION_SLIDES.length;
const POLL_MS = 500;

function slideStorageKey(displayId) { return `grmetro.presentation.${displayId}.slideIndex`; }
function rememberedSlideIndex(displayId) { try { const value=Number(window.sessionStorage.getItem(slideStorageKey(displayId))); return Number.isInteger(value)&&value>=0&&value<slideCount?value:0; } catch { return 0; } }
function rememberSlideIndex(displayId,index){if(!Number.isInteger(index)||index<0)return;try{window.sessionStorage.setItem(slideStorageKey(displayId),String(index%slideCount));}catch{/* optional */}}
function stateUrl(displayId){return `/api/v1/presentation/${encodeURIComponent(displayId)}`;}
function actionUrl(displayId,type,payload={}){
  const names={
    [PRESENTATION_COMMANDS.NEXT_SLIDE]:"next",[PRESENTATION_COMMANDS.PREVIOUS_SLIDE]:"previous",
    [PRESENTATION_COMMANDS.PAUSE_ROTATION]:"pause",[PRESENTATION_COMMANDS.RESUME_ROTATION]:"resume",
    [PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER]:"restart",[PRESENTATION_COMMANDS.GO_TO_SLIDE]:"select"
  };
  const base=`${stateUrl(displayId)}/action/${names[type]}`;
  return type===PRESENTATION_COMMANDS.GO_TO_SLIDE?`${base}?index=${encodeURIComponent(payload.index)}`:base;
}

export function PresentationControllerProvider({children}){return <PresentationControllerContext.Provider value={true}>{children}</PresentationControllerContext.Provider>;}

export function usePresentationController(requestedDisplayId=DEFAULT_DISPLAY_ID,clientType="display"){
  if(!useContext(PresentationControllerContext))throw new Error("usePresentationController must be used within PresentationControllerProvider");
  const displayId=findDisplay(requestedDisplayId)?.id??DEFAULT_DISPLAY_ID;
  const display=findDisplay(displayId);
  const [state,setState]=useState(()=>({displayId,displayName:display.name,presentationProfile:display.presentationProfile,activeSlideIndex:rememberedSlideIndex(displayId),isRunning:true,timerRevision:0,lastUpdated:null}));
  const [connectionState,setConnectionState]=useState("connecting");
  const [transport,setTransport]=useState(null);
  const [runtime,setRuntime]=useState({reconnectCount:0,lastSynchronization:null,lastCommandError:null});

  const acceptState=useCallback((nextState)=>{
    if(!nextState||nextState.displayId!==displayId)return;
    rememberSlideIndex(displayId,nextState.activeSlideIndex);setState(nextState);
    setRuntime(current=>({...current,lastSynchronization:Date.now()}));
  },[displayId]);

  useEffect(()=>{
    setState(current=>({...current,displayId,displayName:display.name,presentationProfile:display.presentationProfile,activeSlideIndex:current.displayId===displayId?current.activeSlideIndex:rememberedSlideIndex(displayId)}));
    const nextTransport=createWebSocketPresentationTransport({displayId,clientType,reconnectMinimumMs:RUNTIME_SETTINGS.reconnectMinimumMs,reconnectMaximumMs:RUNTIME_SETTINGS.reconnectMaximumMs,onState:acceptState,onConnectionChange:setConnectionState,onReconnectAttempt:()=>setRuntime(current=>({...current,reconnectCount:current.reconnectCount+1}))});
    setTransport(nextTransport);return()=>nextTransport.close();
  },[clientType,display.name,display.presentationProfile,displayId,acceptState]);

  // HTTP state is the fallback source of truth for BOTH the TV and phone. This means
  // a stale/broken WebSocket cannot detach the remote from the physical display.
  useEffect(()=>{let stopped=false;let timer;
    const poll=async()=>{try{const response=await fetch(stateUrl(displayId),{cache:"no-store"});if(!response.ok)throw new Error(`Presentation state HTTP ${response.status}`);const body=await response.json();if(!stopped&&body.state){acceptState(body.state);setConnectionState("connected");}}catch(error){if(!stopped)setRuntime(current=>({...current,lastCommandError:error.message}));}finally{if(!stopped)timer=window.setTimeout(poll,POLL_MS);}};
    poll();return()=>{stopped=true;if(timer)window.clearTimeout(timer);};
  },[displayId,acceptState]);

  useEffect(()=>{rememberSlideIndex(displayId,state.activeSlideIndex);},[displayId,state.activeSlideIndex]);

  const send=useCallback(async(type,payload={})=>{
    setRuntime(current=>({...current,lastCommandError:null}));
    // HTTP is authoritative for user controls. WebSocket remains useful for instant
    // broadcast, but commands no longer depend on the socket being healthy.
    try{
      const response=await fetch(actionUrl(displayId,type,payload),{method:"GET",cache:"no-store",headers:{Accept:"application/json"}});
      const body=await response.json().catch(()=>null);
      if(!response.ok||!body?.ok)throw new Error(body?.error?.message||`Presentation command HTTP ${response.status}`);
      acceptState(body.state);
      return body.state;
    }catch(error){
      setRuntime(current=>({...current,lastCommandError:error.message}));
      // Last-resort delivery over the already-open socket.
      try{transport?.send(createPresentationCommand(type,displayId,payload));}catch{/* polling will expose whether state changed */}
      return null;
    }
  },[displayId,transport,acceptState]);

  return useMemo(()=>({...state,...runtime,connectionState,activeSlide:PRESENTATION_SLIDES[state.activeSlideIndex%slideCount],displays:PRESENTATION_DISPLAYS,slides:PRESENTATION_SLIDES,
    nextSlide:()=>send(PRESENTATION_COMMANDS.NEXT_SLIDE),pauseRotation:()=>send(PRESENTATION_COMMANDS.PAUSE_ROTATION),previousSlide:()=>send(PRESENTATION_COMMANDS.PREVIOUS_SLIDE),restartRotationTimer:()=>send(PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER),resumeRotation:()=>send(PRESENTATION_COMMANDS.RESUME_ROTATION),selectSlide:(index)=>send(PRESENTATION_COMMANDS.GO_TO_SLIDE,{index}),setRuntimePaused:()=>{},reconnect:()=>transport?.reconnect()}),[connectionState,runtime,send,state,transport]);
}
