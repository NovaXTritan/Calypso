// BlackHoleThree.jsx - Three.js Black Hole (lazy loaded)
import React, { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'
import useVisibility from '../hooks/useVisibility'
import useMouseParallax from '../hooks/useMouseParallax'
import useIsTouchDevice from '../hooks/useIsTouchDevice'

function glowTex(){
  const size=256, c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d')
  const g=ctx.createRadialGradient(size/2,size/2,6,size/2,size/2,size/2)
  g.addColorStop(0,'rgba(255,190,120,0.65)'); g.addColorStop(0.3,'rgba(255,160,95,0.40)'); g.addColorStop(1,'rgba(0,0,0,0)')
  ctx.fillStyle=g; ctx.fillRect(0,0,size,size)
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t
}

export default function BlackHoleThree({ intensity = 1.0 }){
  const ref=useRef(null); const raf=useRef(0); const rendererRef=useRef(null)
  const prefersReduced = usePrefersReducedMotion()
  const visible = useVisibility()
  const target = useMouseParallax(0.02)
  const isMobile = useIsTouchDevice()

  // Memoize performance settings based on device
  const settings = useMemo(() => ({
    // Reduce stars significantly on mobile
    starCount: prefersReduced ? 400 : (isMobile ? 800 : 1600),
    starSpread: prefersReduced ? 60 : (isMobile ? 70 : 90),
    // Reduce geometry segments on mobile for better GPU performance
    sphereSegments: isMobile ? 32 : 64,
    torusRadialSegments: isMobile ? 32 : 64,
    torusTubularSegments: isMobile ? 128 : 256,
    ringSegments: isMobile ? 64 : 256,
    // Lower pixel ratio on mobile
    pixelRatio: isMobile ? Math.min(1.5, window.devicePixelRatio) : Math.min(2, window.devicePixelRatio),
    // Disable antialiasing on mobile for performance
    antialias: !isMobile
  }), [prefersReduced, isMobile])

  useEffect(()=>{
    const el=ref.current
    if (!el) return

    const scene=new THREE.Scene()
    const camera=new THREE.PerspectiveCamera(60, el.clientWidth/el.clientHeight, 0.1, 1000); camera.position.set(0,0.8,8)
    const renderer=new THREE.WebGLRenderer({antialias:settings.antialias, alpha:true}); renderer.setPixelRatio(settings.pixelRatio); renderer.setSize(el.clientWidth, el.clientHeight); rendererRef.current=renderer; el.appendChild(renderer.domElement)

    const starsGeo=new THREE.BufferGeometry(); const N = settings.starCount; const pos=new Float32Array(N*3)
    for(let i=0;i<N;i++){ const r=settings.starSpread*Math.pow(Math.random(),0.35), th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1); pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.sin(ph)*Math.sin(th); pos[i*3+2]=r*Math.cos(ph) }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(pos,3))
    const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xffffff,size:0.015})); scene.add(stars)

    const core=new THREE.Mesh(new THREE.SphereGeometry(1.1,settings.sphereSegments,settings.sphereSegments), new THREE.MeshStandardMaterial({color:0x000000, roughness:1})); scene.add(core)
    const ambient=new THREE.AmbientLight(0xffffff,0.32), key=new THREE.PointLight(0xffa060,2.0,60); key.position.set(6,2,6); scene.add(ambient,key)
    const torus=new THREE.Mesh(new THREE.TorusGeometry(2.3,0.5,settings.torusRadialSegments,settings.torusTubularSegments), new THREE.MeshStandardMaterial({color:0x221a10, emissive:0xff9850, emissiveIntensity:1.5*intensity, roughness:0.45, metalness:0.65})); torus.rotation.x=Math.PI/2.35; scene.add(torus)
    const ring=new THREE.Mesh(new THREE.TorusGeometry(3.2,0.14,16,settings.ringSegments), new THREE.MeshBasicMaterial({color:0xffb36b, transparent:true, opacity:0.25})); ring.rotation.x=Math.PI/2.35; scene.add(ring)

    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(), depthWrite:false, depthTest:false})); glow.scale.set(10,10,1); glow.position.set(1.2,0,0); scene.add(glow)

    const onResize=()=>{ camera.aspect=el.clientWidth/el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight) }

    window.addEventListener('resize', onResize)

    let last=0
    const tick=(t=0)=>{
      const dt = t - last; last = t
      if (visible) {
        const tx = target.current?.x || 0, ty = target.current?.y || 0
        camera.position.x = tx; camera.position.y = 0.8 + ty * 0.2
        camera.lookAt(0,0,0)
        if (!prefersReduced) {
          stars.rotation.y += 0.0007 * (dt/16)
          torus.rotation.z += 0.004 * (dt/16)
          ring.rotation.z  -= 0.002 * (dt/16)
          glow.material.rotation += 0.0008 * (dt/16)
        }
        renderer.render(scene,camera)
      }
      raf.current=requestAnimationFrame(tick)
    }
    tick()

    return ()=>{
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', onResize)
      if (rendererRef.current) { rendererRef.current.dispose(); el.removeChild(rendererRef.current.domElement) }
      scene.traverse(o=>{
        if (o.geometry) o.geometry.dispose?.()
        const m=o.material; if (m) { Array.isArray(m)?m.forEach(mm=>mm.dispose?.()):m.dispose?.() }
      })
    }
  }, [prefersReduced, visible, intensity, settings])

  return <div ref={ref} className="absolute inset-0" />
}
