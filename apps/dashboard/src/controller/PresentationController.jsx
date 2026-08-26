import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DISPLAY_ID, findDisplay, PRESENTATION_DISPLAYS } from "../config/displayRegistry";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { createWebSocketPresentationTransport } from "./presentationTransport";
import { RUNTIME_SETTINGS } from "../config/runtimeSettings";

const PresentationControllerContext = createContext(null);
const slideCount = PRESENTATION_SLIDES.length;
const POLL_MS = 300;
const DISPLAY_HEARTBEAT_MS = 2500;

function slideStorageKey(displayId) { return `grmetro.presentation.${displayId}.slideIndex`; }
function rememberedSlideIndex(displayId) { try { const value=Number(window.sessionStorage.getItem(slideStorageKey(displayId))); return Number.isInteger(value)&&value>=0&&value<slideCount?value:0; } catch{return 0;} }
function rememberSlideIndex(displayId,index){if(!Number.isInteger(index)||index<0)return;try{window.sessionStorage.setItem(slideStorageKey(displayId),String(index%slideCount));}catch{/* optional */}}
async function jsonRequest(path,options={}){const response=await fetch(path,{cache:"no-store",...options});if(!response.ok){let detail="";try{detail=JSON.stringify(await response.json());}catch{/* ignore */}throw new Error(`presentation request failed (${response.status})${detail?`: ${detail}`:""}`);}return response.json();}
function applyState(setState,displayId,payload){const next=payload?.state;if(!next||next.displayId!==displayId)return;rememberSlideIndex(displayId,next.activeSlideIndex);setState(next);}

export function PresentationControllerProvider({children}){return <PresentationControllerContext.Provider value={true}>{children}</PresentationControllerContext.Provider>;}

export function usePresentationController(requestedDisplayId=DEFAULT_DISPLAY_ID,clientType="display"){
  if(!useContext(PresentationControllerContext))throw new Error("usePresentationController must be used within PresentationControllerProvider");
  const displayId=findDisplay(requestedDisplayId)?.id??DEFAULT_DISPLAY_ID;const display=findDisplay(displayId);
  const [state,setState]=useState(()=>({displayId,displayName:display.name,presentationProfile:display.presentationProfile,activeSlideIndex:rememberedSlideIndex(displayId),isRunning:true,timerRevision:0,lastUpdated:null}));
  const [transportConnectionState,setTransportConnectionState]=useState("connecting");const [targetDisplayOnline,setTargetDisplayOnline]=useState(clientType!=="remote");const [transport,setTransport]=useState(null);const [runtime,setRuntime]=useState({reconnectCount:0,lastSynchronization:null,lastCommandError:null,lastCommandAt:null});

  useEffect(()=>{setState(current=>({...current,displayId,displayName:display.name,presentationProfile:display.presentationProfile,activeSlideIndex:current.displayId===displayId?current.activeSlideIndex:rememberedSlideIndex(displayId)}));
    let nextTransport=null;
    try{nextTransport=createWebSocketPresentationTransport({displayId,clientType,location:window.location,reconnectMinimumMs:RUNTIME_SETTINGS.reconnectMinimumMs,reconnectMaximumMs:RUNTIME_SETTINGS.reconnectMaximumMs,onState:(nextState)=>{rememberSlideIndex(displayId,nextState.activeSlideIndex);setState(nextState);setRuntime(current=>({...current,lastSynchronization:Date.now()}));},onConnectionChange:setTransportConnectionState,onReconnectAttempt:()=>setRuntime(current=>({...current,reconnectCount:current.reconnectCount+1}))});setTransport(nextTransport);}catch{setTransportConnectionState("reconnecting");}
    return()=>nextTransport?.close();},[clientType,display.name,display.presentationProfile,displayId]);

  useEffect(()=>{let active=true;const poll=async()=>{try{const suffix=clientType==="display"?"?clientType=display":"";const payload=await jsonRequest(`/api/v1/presentation/${encodeURIComponent(displayId)}${suffix}`);if(!active)return;applyState(setState,displayId,payload);setRuntime(current=>({...current,lastSynchronization:Date.now()}));if(clientType==="remote")setTargetDisplayOnline(payload.online===true);}catch{if(active&&clientType==="remote")setTargetDisplayOnline(false);}};poll();const timer=window.setInterval(poll,POLL_MS);return()=>{active=false;window.clearInterval(timer);};},[clientType,displayId]);

  useEffect(()=>{if(clientType!=="display")return undefined;let active=true;const heartbeat=()=>jsonRequest(`/api/v1/presentation/${encodeURIComponent(displayId)}/heartbeat`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}).catch(()=>{});heartbeat();const timer=window.setInterval(()=>{if(active)heartbeat();},DISPLAY_HEARTBEAT_MS);return()=>{active=false;window.clearInterval(timer);};},[clientType,displayId]);

  useEffect(()=>{rememberSlideIndex(displayId,state.activeSlideIndex);},[displayId,state.activeSlideIndex]);
  const action=useCallback(async(name,payload={})=>{
    if(clientType!=="remote"){
      if(name==="next")setState(current=>({...current,activeSlideIndex:(current.activeSlideIndex+1)%slideCount}));
      if(name==="previous")setState(current=>({...current,activeSlideIndex:(current.activeSlideIndex-1+slideCount)%slideCount}));
      if(name==="select"&&Number.isInteger(payload.index))setState(current=>({...current,activeSlideIndex:payload.index%slideCount}));
      if(name==="pause")setState(current=>({...current,isRunning:false}));
      if(name==="resume")setState(current=>({...current,isRunning:true}));
    }
    const query=name==="select"?`?index=${encodeURIComponent(payload.index)}`:"";
    try{
      const result=await jsonRequest(`/api/v1/presentation/${encodeURIComponent(displayId)}/action/${encodeURIComponent(name)}${query}`);
      applyState(setState,displayId,result);
      setRuntime(current=>({...current,lastSynchronization:Date.now(),lastCommandAt:Date.now(),lastCommandError:null}));
      if(clientType==="remote")setTargetDisplayOnline(result.online===true);
      return result;
    }catch(error){
      setRuntime(current=>({...current,lastCommandAt:Date.now(),lastCommandError:error.message}));
      console.error("Presentation action failed",{displayId,name,error});
      throw error;
    }
  },[clientType,displayId]);
  const connectionState=clientType==="remote"?(targetDisplayOnline?"connected":"offline"):transportConnectionState;
  return useMemo(()=>({...state,...runtime,connectionState,targetDisplayOnline,activeSlide:PRESENTATION_SLIDES[state.activeSlideIndex%slideCount],displays:PRESENTATION_DISPLAYS,slides:PRESENTATION_SLIDES,nextSlide:()=>action("next"),pauseRotation:()=>action("pause"),previousSlide:()=>action("previous"),restartRotationTimer:()=>action("restart"),resumeRotation:()=>action("resume"),selectSlide:(index)=>action("select",{index}),setRuntimePaused:()=>{},reconnect:()=>transport?.reconnect()}),[action,connectionState,runtime,state,targetDisplayOnline,transport]);
}
