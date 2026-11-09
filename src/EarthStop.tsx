import React from 'react';
import {AbsoluteFill, Audio, interpolate, useCurrentFrame, staticFile} from 'remotion';

const BG = '#050505';
const WHITE = '#F5F5F5';
const SOFT = '#BDBDBD';

const Earth: React.FC<{size:number; rotation:number}> = ({size, rotation}) => (
  <div style={{
    width:size,height:size,borderRadius:'50%',
    border:`5px solid ${WHITE}`, position:'relative',
    boxShadow:`0 0 35px rgba(255,255,255,.18)`,
    overflow:'hidden', transform:`rotate(${rotation}deg)`,
  }}>
    <div style={{position:'absolute', width:'44%',height:'26%',left:'12%',top:'19%',
      background:SOFT,borderRadius:'60% 40% 55% 45%', transform:'rotate(-12deg)'}} />
    <div style={{position:'absolute', width:'28%',height:'34%',right:'14%',top:'14%',
      background:SOFT,borderRadius:'55% 45% 45% 60%', transform:'rotate(18deg)'}} />
    <div style={{position:'absolute', width:'25%',height:'39%',left:'32%',bottom:'8%',
      background:SOFT,borderRadius:'45% 55% 50% 45%', transform:'rotate(20deg)'}} />
    <div style={{position:'absolute', inset:'18% 8%', borderTop:`2px solid rgba(255,255,255,.25)`,
      borderBottom:`2px solid rgba(255,255,255,.18)`, borderRadius:'50%'}} />
  </div>
);

const Arrows: React.FC<{count?:number}> = ({count=5}) => (
  <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
    {Array.from({length:count}).map((_,i)=>(
      <div key={i} style={{
        position:'absolute', left:'10%', right:'10%', top:`${30+i*9}%`,
        height:4, background:WHITE, opacity:.8,
        boxShadow:'0 0 10px rgba(255,255,255,.25)'
      }}>
        <div style={{
          position:'absolute', right:-1, top:-8, width:0,height:0,
          borderTop:'10px solid transparent',borderBottom:'10px solid transparent',
          borderLeft:`18px solid ${WHITE}`
        }}/>
      </div>
    ))}
  </div>
);

const Text: React.FC<{children:React.ReactNode; size?:number}> = ({children,size=70}) => (
  <div style={{fontFamily:'Arial, Helvetica, sans-serif',fontWeight:800,
    fontSize:size,lineHeight:1.02,letterSpacing:1,color:WHITE,textAlign:'center'}}>
    {children}
  </div>
);

export const EarthStop: React.FC = () => {
  const f=useCurrentFrame();
  const sec=f/30;

  let scene=0;
  if(sec>=6 && sec<13) scene=1;
  else if(sec>=13 && sec<22) scene=2;
  else if(sec>=22) scene=3;

  const earthRot = scene===0 ? interpolate(f,[0,150],[0,360],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})
    : scene===3 ? interpolate(f,[660,900],[0,360],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})
    : 0;

  return (
    <AbsoluteFill style={{background:BG, overflow:'hidden'}}>
      {scene===0 && (
        <>
          <div style={{position:'absolute',top:150,width:'100%'}}><Text size={68}>WHAT IF EARTH<br/>STOPPED SPINNING?</Text></div>
          <div style={{position:'absolute',top:610,left:0,right:0,display:'flex',justifyContent:'center'}}>
            <Earth size={500} rotation={earthRot}/>
          </div>
          <div style={{position:'absolute',top:1210,width:'100%',textAlign:'center',fontFamily:'Arial',fontWeight:700,fontSize:34,color:SOFT,letterSpacing:4}}>
            ROTATION STOPS
          </div>
        </>
      )}

      {scene===1 && (
        <>
          <div style={{position:'absolute',top:150,width:'100%'}}><Text size={68}>BUT EVERYTHING<br/>KEEPS MOVING.</Text></div>
          <div style={{position:'absolute',top:500,left:0,right:0,height:950}}>
            <div style={{position:'absolute',left:'11%',right:'11%',bottom:200,height:300,borderTop:`5px solid ${WHITE}`}}>
              {[0,1,2,3,4].map(i=><div key={i} style={{
                position:'absolute',bottom:0,left:`${i*20}%`,width:'14%',height:`${25+i*10}%`,
                border:`4px solid ${SOFT}`}}/>)}
            </div>
            <Arrows count={5}/>
          </div>
          <div style={{position:'absolute',bottom:250,width:'100%',textAlign:'center'}}>
            <Text size={48}>GROUND: STOPPED</Text>
          </div>
        </>
      )}

      {scene===2 && (
        <>
          <div style={{position:'absolute',top:120,width:'100%'}}><Text size={60}>THE ATMOSPHERE.</Text></div>
          <div style={{position:'absolute',top:500,left:0,right:0,height:360}}><Arrows count={4}/></div>
          <div style={{position:'absolute',top:850,width:'100%'}}><Text size={58}>THE OCEANS.</Text></div>
          <div style={{position:'absolute',top:1030,left:0,right:0,height:400}}>
            {[0,1,2,3].map(i=><div key={i} style={{
              position:'absolute',left:'8%',right:'8%',top:i*85,height:50,
              borderTop:`5px solid ${WHITE}`,borderRadius:'50%'}}/>)}
          </div>
          <div style={{position:'absolute',bottom:180,width:'100%'}}><Text size={76}>EVERYTHING.</Text></div>
        </>
      )}

      {scene===3 && (
        <>
          <div style={{position:'absolute',top:240,width:'100%'}}><Text size={70}>THEN...</Text></div>
          <div style={{position:'absolute',top:610,left:0,right:0,display:'flex',justifyContent:'center'}}>
            <Earth size={500} rotation={earthRot}/>
          </div>
          <div style={{position:'absolute',top:1260,width:'100%'}}><Text size={55}>EARTH STARTS AGAIN.</Text></div>
          <div style={{position:'absolute',top:1410,width:'100%'}}><Text size={82}>ONE SECOND.</Text></div>
        </>
      )}

      <Audio src={staticFile('sfx/dark_ambient_10s.wav')} volume={0.08} loop/>
      {scene===0 && f===150 && <Audio src={staticFile('sfx/deep_impact.wav')} volume={0.5}/>}
      {scene===1 && f===180 && <Audio src={staticFile('sfx/whoosh.wav')} volume={0.35}/>}
      {scene===2 && f===390 && <Audio src={staticFile('sfx/whoosh.wav')} volume={0.25}/>}
      {scene===3 && f===660 && <Audio src={staticFile('sfx/deep_impact.wav')} volume={0.45}/>}
    </AbsoluteFill>
  );
};
