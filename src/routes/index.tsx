import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { WatchCollection } from "@/components/WatchCollection";
import watchGold from "@/assets/watch-gold.png";
import watchSteel from "@/assets/watch-steel.png";
import watchRosegold from "@/assets/watch-rosegold.png";
import watchBlack from "@/assets/watch-black.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Private Flight — The Watch Collection" },
      {
        name: "description",
        content:
          "A black-and-gold scroll experience where a private jet flies through a collection of precision watches.",
      },
      { property: "og:title", content: "Private Flight — The Watch Collection" },
      {
        property: "og:description",
        content:
          "A black-and-gold scroll experience where a private jet flies through a collection of precision watches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      const [{ gsap }, { ScrollTrigger }, { ScrollToPlugin }, THREE, { RoomEnvironment }] =
        await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("gsap/ScrollToPlugin"),
          import("three"),
          import("three/examples/jsm/environments/RoomEnvironment.js"),
        ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
      const watches = Array.from(rootRef.current?.querySelectorAll<HTMLImageElement>(".watch-img") ?? []);
      cleanups.push(() => watches.forEach(watch => watch.style.removeProperty("--watch-proximity")));
      const root = rootRef.current;
      const TONES: Record<string, number> = { steel: 0xb9c6cf, black: 0x3a3f46, gold: 0xd9b45a, rosegold: 0xe0a48e };
      const basePaint = new THREE.Color(0xf0f3f3);
      const toneColor = new THREE.Color();
      let tintMaterial: any = null;
      let activeTone = "";

      // Keep the jet's on-screen size constant: it must never look bigger later
      // in the scroll than at the start, so scale is pulled back as it nears the camera.
      const JET_SCALE = 2.2;
      const JET_REF_DISTANCE = 181;

      class Scene {
        views: Array<{ bottom: number; height: number; camera: any }>;
        renderer: any;
        scene: any;
        light: any;
        softLight: any;
        modelGroup: any;
        w = 0;
        h = 0;
        aircraftSamples: Array<InstanceType<typeof THREE.Vector3>> = [];
        projectedSample = new THREE.Vector3();

        constructor(model: any) {
          model.updateWorldMatrix(true, true);
          const bounds = new THREE.Box3().setFromObject(model);
          // Sample the fuselage from tail to nose, in the animated group's local space.
          for (let i = 0; i <= 12; i++) {
            this.aircraftSamples.push(new THREE.Vector3(0, 0, THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, i / 12)));
          }
          this.views = [
            { bottom: 0, height: 1, camera: null },
            { bottom: 0, height: 0, camera: null },
          ];

          this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
          this.renderer.setSize(window.innerWidth, window.innerHeight);
          this.renderer.shadowMap.enabled = true;
          this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
           this.renderer.toneMappingExposure = 1.35;
          document.body.appendChild(this.renderer.domElement);

          this.scene = new THREE.Scene();

          // Image-based lighting for realistic metal/paint reflections.
          const pmrem = new THREE.PMREMGenerator(this.renderer);
          const envScene = new RoomEnvironment();
          this.scene.environment = pmrem.fromScene(envScene, 0.04).texture;
          pmrem.dispose();

          for (let ii = 0; ii < this.views.length; ++ii) {
            const view = this.views[ii];
            if (!view) continue;
            const camera = new THREE.PerspectiveCamera(
              45,
              window.innerWidth / window.innerHeight,
              1,
              2000,
            );
            camera.position.fromArray([0, 0, 180]);
            camera.layers.disableAll();
            camera.layers.enable(ii);
            view.camera = camera;
            camera.lookAt(new THREE.Vector3(0, 5, 0));
          }

          this.light = new THREE.PointLight(0xffffff, 2);
          this.light.position.z = 150;
          this.light.position.x = 70;
          this.light.position.y = -20;
          this.scene.add(this.light);

           this.softLight = new THREE.AmbientLight(0xffffff, 0.65);
          this.scene.add(this.softLight);
           const fill = new THREE.DirectionalLight(0xdceafb, 2.7);
          fill.position.set(-60, 80, 40);
          this.scene.add(fill);
           const rim = new THREE.DirectionalLight(0xffebd1, 2);
          rim.position.set(30, 20, -90);
          this.scene.add(rim);
           const sideFill = new THREE.DirectionalLight(0xffffff, 1.4);
           sideFill.position.set(70, 30, 50);
           this.scene.add(sideFill);

          this.onResize();
          window.addEventListener("resize", this.onResize, false);

          let raf = 0;
          const animate = () => {
            this.render();
            raf = requestAnimationFrame(animate);
          };
          animate();

          cleanups.push(() => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", this.onResize);
            this.renderer.domElement.remove();
            this.renderer.dispose();
          });

          this.modelGroup = model;
          this.scene.add(this.modelGroup);
        }

        render = () => {
          // Keep the jet's apparent size constant: pull the model back down as it
          // nears the camera so it never looks larger than it did at the start.
          const anchor = this.views[0]?.camera;
          if (anchor && this.modelGroup) {
            const distance = Math.max(60, anchor.position.distanceTo(this.modelGroup.position));
            const keepSize = THREE.MathUtils.clamp(distance / JET_REF_DISTANCE, 0.2, 1.35);
            this.modelGroup.scale.setScalar(JET_SCALE * keepSize);
          }
          for (let ii = 0; ii < this.views.length; ++ii) {
            const view = this.views[ii];
            if (!view) continue;
            const camera = view.camera;
            const bottom = Math.floor(this.h * view.bottom);
            const height = Math.floor(this.h * view.height);
            if (height <= 0) continue;

            this.renderer.setViewport(0, 0, this.w, this.h);
            this.renderer.setScissor(0, bottom, this.w, height);
            this.renderer.setScissorTest(true);

            camera.aspect = this.w / this.h;
            camera.updateProjectionMatrix();
            this.renderer.render(this.scene, camera);
          }
          const camera = this.views[0]?.camera;
          if (!camera || !this.modelGroup) return;
          this.modelGroup.updateWorldMatrix(true, false);
          const reach = Math.max(150, Math.min(this.w, this.h) * 0.28);
          const aircraftPixels = this.aircraftSamples.map(sample => {
            this.projectedSample.copy(sample).applyMatrix4(this.modelGroup.matrixWorld).project(camera);
            return {
              x: (this.projectedSample.x + 1) * this.w / 2,
              y: (1 - this.projectedSample.y) * this.h / 2,
              visible: this.projectedSample.z >= -1 && this.projectedSample.z <= 1,
            };
          });
          watches.forEach(watch => {
            const rect = watch.getBoundingClientRect();
            let distance = Infinity;
            if (rect.bottom > 0 && rect.top < this.h) {
              for (const point of aircraftPixels) {
                if (!point.visible || point.x < -reach || point.x > this.w + reach || point.y < -reach || point.y > this.h + reach) continue;
                const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
                const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
                distance = Math.min(distance, Math.hypot(dx, dy));
              }
            }
            const proximity = 1 - THREE.MathUtils.smoothstep(distance, 0, reach);
            watch.style.setProperty("--watch-proximity", proximity.toFixed(3));
            (watch as any)._prox = proximity;
          });
          // Spotlight + color sync: find the watch the jet is passing.
          let best: HTMLImageElement | null = null;
          let bestProx = 0;
          for (const watch of watches) {
            const p = (watch as any)._prox ?? 0;
            if (p > bestProx) { bestProx = p; best = watch; }
          }
          for (const watch of watches) {
            const own = (watch as any)._prox ?? 0;
            watch.style.setProperty("--watch-dim", (bestProx * (1 - own)).toFixed(3));
          }
          const nose = aircraftPixels[aircraftPixels.length - 1];
          if (root) {
            root.style.setProperty("--beam-strength", bestProx.toFixed(3));
            if (nose) {
              root.style.setProperty("--beam-x", `${nose.x.toFixed(0)}px`);
              root.style.setProperty("--beam-y", `${nose.y.toFixed(0)}px`);
            }
            if (best) {
              const r = best.getBoundingClientRect();
              root.style.setProperty("--spot-x", `${(r.left + r.width / 2).toFixed(0)}px`);
              root.style.setProperty("--spot-y", `${(r.top + r.height / 2).toFixed(0)}px`);
              const tone = best.dataset['tone'] ?? "";
              if (bestProx > 0.15 && tone !== activeTone) {
                activeTone = tone;
                root.dataset['tone'] = tone;
              }
            }
          }
          if (tintMaterial) {
            toneColor.set(TONES[activeTone] ?? 0xf0f3f3);
            const target = basePaint.clone().lerp(toneColor, bestProx * 0.65);
            tintMaterial.color.lerp(target, 0.08);
          }
        };

        onResize = () => {
          this.w = window.innerWidth;
          this.h = window.innerHeight;
          const aspect = this.w / this.h;
          for (let ii = 0; ii < this.views.length; ++ii) {
            const camera = this.views[ii]?.camera;
            if (!camera) continue;
            camera.aspect = aspect;
            // Pull the camera back on narrow (portrait) screens so the jet's
            // sideways flight path stays inside the visible frame.
            camera.position.z = 180 * Math.max(1, Math.min(1.7, 1.15 / Math.max(aspect, 0.4)));
            camera.updateProjectionMatrix();
          }
          this.renderer.setSize(this.w, this.h);
          this.render();
        };
      }

      function setupAnimation(model: any) {
        if (disposed) return;
        const scene = new Scene(model);
        const plane = scene.modelGroup;

        const ctx = gsap.context(() => {
          gsap.fromTo(
            scene.renderer.domElement,
            { x: "50%", autoAlpha: 0 },
            { duration: 1, x: "0%", autoAlpha: 1, delay: 0.5 },
          );
           gsap.to(".loading", { autoAlpha: 0, duration: 0.4 });
          gsap.to(".scroll-cta", { opacity: 1 });
          gsap.set(".blueprint > svg", { autoAlpha: 1 });

          const tau = Math.PI * 2;
          // On narrow screens the camera sees a thinner slice of the scene, so
          // shrink the jet's sideways travel to keep it inside the frame.
          const pathScale = () =>
            Math.min(1, Math.max(0.35, (window.innerWidth / window.innerHeight) / 1.3));
          gsap.set(plane.rotation, { y: tau * -0.25 });
            gsap.set(plane.position, { x: 18 * pathScale(), y: -8, z: 0 });
          scene.render();

          const sectionDuration = 1;

          gsap.to("#line-length", {
            strokeDashoffset: 0,
            scrollTrigger: { trigger: ".length", scrub: true, start: "top bottom", end: "top top" },
          });
          gsap.to("#line-wingspan", {
            strokeDashoffset: 0,
            scrollTrigger: {
              trigger: ".wingspan",
              scrub: true,
              start: "top 25%",
              end: "bottom 50%",
            },
          });
          gsap.to("#circle-phalange", {
            strokeDashoffset: 0,
            scrollTrigger: {
              trigger: ".phalange",
              scrub: true,
              start: "top 50%",
              end: "bottom 100%",
            },
          });
          gsap.to("#line-length", {
            opacity: 0,
            strokeDashoffset: 80,
            scrollTrigger: { trigger: ".length", scrub: true, start: "top top", end: "bottom top" },
          });
          gsap.to("#line-wingspan", {
            opacity: 0,
            strokeDashoffset: 110,
            scrollTrigger: {
              trigger: ".wingspan",
              scrub: true,
              start: "top top",
              end: "bottom top",
            },
          });
          gsap.to("#circle-phalange", {
            opacity: 0,
            strokeDashoffset: 94,
            scrollTrigger: {
              trigger: ".phalange",
              scrub: true,
              start: "top top",
              end: "bottom top",
            },
          });

          gsap.fromTo(
            scene.renderer.domElement,
            { autoAlpha: 1 },
            { autoAlpha: 0, immediateRender: false, scrollTrigger: { trigger: ".collection", start: "top 85%", end: "top 40%", scrub: true } },
          );
          const tl = gsap.timeline({
            onUpdate: scene.render,
            scrollTrigger: {
              trigger: ".content",
              scrub: true,
              start: "top top",
              end: "bottom bottom",
              invalidateOnRefresh: true,
            },
            defaults: { duration: sectionDuration, ease: "power2.inOut" },
          });

          let delay = 0;
          tl.to(".scroll-cta", { duration: 0.25, opacity: 0 }, delay);
           tl.to(plane.position, { x: () => -10 * pathScale(), ease: "power1.in" }, delay);

          delay += sectionDuration;
          tl.to(plane.rotation, { x: tau * 0.25, y: 0, z: -tau * 0.05, ease: "power1.inOut" }, delay);
          tl.to(plane.position, { x: () => -40 * pathScale(), y: 0, z: -60, ease: "power1.inOut" }, delay);

          delay += sectionDuration;
          tl.to(plane.rotation, { x: tau * 0.25, y: 0, z: tau * 0.05, ease: "power3.inOut" }, delay);
          tl.to(plane.position, { x: () => 40 * pathScale(), y: 0, z: -60, ease: "power2.inOut" }, delay);

          delay += sectionDuration;
          tl.to(plane.rotation, { x: tau * 0.2, y: 0, z: -tau * 0.1, ease: "power3.inOut" }, delay);
          tl.to(plane.position, { x: () => -40 * pathScale(), y: 0, z: -30, ease: "power2.inOut" }, delay);

          delay += sectionDuration;
          tl.to(plane.rotation, { x: 0, z: 0, y: tau * 0.25 }, delay);
          tl.to(plane.position, { x: 0, y: -10, z: 50 }, delay);

          delay += sectionDuration * 2;
          tl.to(plane.rotation, { x: tau * 0.25, y: tau * 0.5, z: 0, ease: "power4.inOut" }, delay);
          tl.to(plane.position, { z: 30, ease: "power4.inOut" }, delay);

          delay += sectionDuration;
          tl.to(plane.rotation, { x: tau * 0.25, y: tau * 0.5, z: 0, ease: "power4.inOut" }, delay);
          tl.to(plane.position, { z: 60, x: () => 30 * pathScale(), ease: "power4.inOut" }, delay);

          delay += sectionDuration;
          tl.to(
            plane.rotation,
            { x: tau * 0.35, y: tau * 0.75, z: tau * 0.6, ease: "power4.inOut" },
            delay,
          );
          tl.to(plane.position, { z: 35, x: () => 20 * pathScale(), y: 0, ease: "power4.inOut" }, delay);

          delay += sectionDuration;
          tl.to(plane.rotation, { x: tau * 0.15, y: tau * 0.85, z: 0, ease: "power1.in" }, delay);
          tl.to(plane.position, { z: -150, x: 0, y: 0, ease: "power1.inOut" }, delay);

          delay += sectionDuration;
          tl.to(
            plane.rotation,
            { duration: sectionDuration, x: -tau * 0.05, y: tau, z: -tau * 0.1, ease: "none" },
            delay,
          );
          tl.to(
            plane.position,
            { duration: sectionDuration, x: 0, y: 30, z: 320, ease: "power1.in" },
            delay,
          );
          tl.to(scene.light.position, { duration: sectionDuration, x: 0, y: 0, z: 0 }, delay);
        });

        cleanups.push(() => ctx.revert());
      }

      gsap.set("#line-length", { strokeDasharray: 80, strokeDashoffset: 80 });
      gsap.set("#line-wingspan", { strokeDasharray: 110, strokeDashoffset: 110 });
      gsap.set("#circle-phalange", { strokeDasharray: 94, strokeDashoffset: 94 });

      const paint = new THREE.MeshPhysicalMaterial({ color: 0xf0f0ea, metalness: 0.28, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
      tintMaterial = paint;
      const carbon = new THREE.MeshPhysicalMaterial({ color: 0x11100e, metalness: 0.5, roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide });
      const champagne = new THREE.MeshPhysicalMaterial({ color: 0xc8a95f, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide });
      const glass = new THREE.MeshPhysicalMaterial({ color: 0x151b1d, metalness: 0.22, roughness: 0.08, clearcoat: 1, side: THREE.DoubleSide });
      const intake = new THREE.MeshStandardMaterial({ color: 0x090a0a, metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide });
      const jet = new THREE.Group();
      const add = (geometry: any, material: any, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        jet.add(mesh);
        return mesh;
      };
      // Sleek long-range bizjet: elongated dart fuselage, pointed nose, winglets and a T-tail.
      const profile = [
        [0.03, -8.8], [0.34, -8.35], [0.62, -7.5], [0.86, -6.2], [1.0, -4.4],
        [1.06, -1.5], [1.06, 2.6], [0.98, 4.6], [0.8, 6.1], [0.52, 7.3], [0.22, 8.1], [0.02, 8.55],
      ].map(([radius, z]) => new THREE.Vector2(radius ?? 0, z ?? 0));
      const fuselage = new THREE.LatheGeometry(profile, 64);
      fuselage.rotateX(Math.PI / 2);
      fuselage.scale(1, .82, 1);
      add(fuselage, paint, [0, 0, 0]);
      const surface = (vertices: number[]) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        return geometry;
      };
      // Solid wings with real thickness, dihedral and a smooth belly fairing.
      const planform = (points: [number, number][], thickness: number) => {
        const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: .04, bevelSize: .06, bevelSegments: 2, steps: 1 });
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, thickness / 2, 0);
        return geometry;
      };
      const wingGeo = planform([[0, 1.6], [7.0, -2.6], [6.4, -3.9], [0, -2.4]], .14);
      add(wingGeo, paint, [0, 0, 0], [0, 0, .04]);
      const wingLeft = add(wingGeo, paint, [0, 0, 0], [0, 0, .04]);
      wingLeft.scale.x = -1;
      const fairing = add(new THREE.SphereGeometry(1, 24, 16), paint, [0, -.32, -.4]);
      fairing.scale.set(1.12, .5, 3.4);
      // Upturned champagne winglets at both tips.
      add(surface([
        -7.0, .22, -2.6, -7.15, 1.38, -3.5, -6.55, 1.38, -4.35,
        -7.0, .22, -2.6, -6.55, 1.38, -4.35, -6.4, .22, -3.9,
        7.0, .22, -2.6, 6.4, .22, -3.9, 6.55, 1.38, -4.35,
        7.0, .22, -2.6, 6.55, 1.38, -4.35, 7.15, 1.38, -3.5,
      ]), champagne, [0, 0, 0]);
      // Wingtip navigation lights: red port, green starboard.
      for (const [side, color] of [[-1, 0xff2a2a], [1, 0x2aff5a]] as const) {
        add(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2, roughness: .4 }), [side * 6.85, .5, -3.15]);
      }
      // Vertical fin (taller, slimmer) carrying the T-tail.
      const finGeo = planform([[.3, -6.4], [3.9, -8.1], [3.75, -8.55], [.3, -7.9]], .1);
      finGeo.rotateZ(Math.PI / 2);
      add(finGeo, carbon, [0, 0, 0]);
      add(new THREE.BoxGeometry(.12, .18, .7), champagne, [0, 3.95, -8.3]);
      // T-tail horizontal stabilizer on top of the fin.
      const stabGeo = planform([[0, -7.6], [2.5, -8.5], [2.6, -9.0], [0, -8.5], [-2.6, -9.0], [-2.5, -8.5]], .09);
      add(stabGeo, paint, [0, 3.9, 0]);
      // Beacon on the spine and a pitot probe on the nose.
      add(new THREE.SphereGeometry(.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 2, roughness: .4 }), [0, .85, -1.2]);
      add(new THREE.CylinderGeometry(.022, .022, .55, 10), carbon, [0, -.05, 8.7], [Math.PI / 2, 0, 0]);
      for (const side of [-1, 1]) {
        const engine = add(new THREE.CylinderGeometry(.42, .52, 3.3, 32), carbon, [side * 1.42, .3, -5.4], [Math.PI / 2, 0, 0]);
        engine.scale.x = .82;
        add(new THREE.CircleGeometry(.36, 32), intake, [side * 1.42, .3, -3.74], [0, Math.PI, 0]);
        // Pylon attaching the engine to the fuselage.
        add(new THREE.BoxGeometry(.42, .32, 1.6), paint, [side * 1.1, .45, -5.15]);
        // Tapered exhaust plug at the rear of each engine.
        const exhaust = add(new THREE.CylinderGeometry(.44, .16, .6, 24), intake, [side * 1.42, .3, -7.2], [Math.PI / 2, 0, 0]);
        exhaust.scale.x = .82;
        add(new THREE.TorusGeometry(.41, .04, 10, 32), champagne, [side * 1.42, .3, -3.71], [0, 0, 0]);
        for (const z of [-2.3, -1.35, -.4, .55, 1.5, 2.45, 3.4, 4.3]) {
          const window = add(new THREE.SphereGeometry(.14, 16, 12), glass, [side * 1.0, .3, z]);
          window.scale.set(.28, .7, 1.25);
        }
        const windshield = add(new THREE.SphereGeometry(.4, 18, 14), glass, [side * .55, .4, 6.3]);
        windshield.scale.set(.45, .58, 1.35);
        const stripe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * .5, -.14, -7.4), new THREE.Vector3(side * 1.02, -.14, -4.2),
          new THREE.Vector3(side * 1.06, -.14, 3.6), new THREE.Vector3(side * .45, -.14, 7.2),
        ]), 72, .04, 6, false), champagne);
        jet.add(stripe);
      }
      jet.scale.setScalar(JET_SCALE);
      setupAnimation(jet);
    })();

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  const scrollToBottom = async () => {
    const { gsap } = await import("gsap");
    gsap.to(window, {
      duration: 1.5,
      scrollTo: { y: ".collection", autoKill: false },
      ease: "power2.inOut",
    });
  };

  return (
    <div ref={rootRef} className="plane-app" data-tone="steel">
      <div className="watch-spotlight" aria-hidden="true" />
      <Button id="contact-btn" className="contact-btn" onClick={scrollToBottom}>
        Collection
      </Button>
      <div className="content">
        <div className="loading">Loading</div>
        <div className="trigger" />
        <div className="section">
          <h1>Private Flight.</h1>
          <h3>The watch collection.</h3>
          <p>Precision, elevated.</p>
          <div className="scroll-cta">Scroll</div>
        </div>
        <div className="section right">
            <h2>Designed beyond first class.</h2>
          <img src={watchSteel} data-tone="steel" alt="Luxury steel dive watch" className="watch-img" width={1024} height={1024} loading="lazy" />
        </div>
        <div className="ground-container">
          <div className="section right">
              <h2>Crafted for the journey.</h2>
              <p>Rose gold at altitude.</p>
            <img src={watchRosegold} data-tone="rosegold" alt="Luxury rose gold watch" className="watch-img" width={1024} height={1024} loading="lazy" />
          </div>
          <div className="section">
            <h2>Dark dial. Clear intent.</h2>
            <p>A precise silhouette.</p>
            <img src={watchBlack} data-tone="black" alt="Luxury black skeleton watch" className="watch-img" width={1024} height={1024} loading="lazy" />
          </div>
          <div className="section right">
              <h2>Golden hour, engineered.</h2>
              <p>Measured in every detail.</p>
            <img src={watchGold} data-tone="gold" alt="Luxury gold chronograph watch" className="watch-img" width={1024} height={1024} loading="lazy" />
          </div>
        </div>

        <div className="blueprint">
          <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ display: "none" }}>
            <line
              id="line-length"
              x1="10"
              y1="80"
              x2="90"
              y2="80"
              strokeWidth="0.5"
              stroke="white"
            />
            <path
              id="line-wingspan"
              d="M10 50, L40 35, M60 35 L90 50"
              strokeWidth="0.5"
              stroke="white"
              fill="none"
            />
            <circle
              id="circle-phalange"
              cx="60"
              cy="60"
              r="15"
              fill="transparent"
              strokeWidth="0.5"
              stroke="white"
            />
          </svg>
          <div className="section dark">
            <h2>Private aviation.</h2>
            <p>Compact, fast, considered.</p>
            <img src={watchSteel} data-tone="steel" alt="Luxury steel dive watch" className="watch-img" width={1024} height={1024} loading="lazy" />
          </div>
          <div className="section dark length">
            <h2>Cabin profile.</h2>
            <p>Quietly proportioned.</p>
            <img src={watchBlack} data-tone="black" alt="Luxury black skeleton watch" className="watch-img" width={1024} height={1024} loading="lazy" />
          </div>
          <div className="section dark wingspan">
            <h2>Swept wings.</h2>
            <p>Built for efficient speed.</p>
            <img src={watchGold} data-tone="gold" alt="Luxury gold chronograph watch" className="watch-img" width={1024} height={1024} loading="lazy" />
          </div>
          <div className="section dark phalange">
            <h2>Tail geometry.</h2>
            <p>Balanced and unmistakable.</p>
            <img src={watchRosegold} data-tone="rosegold" alt="Luxury rose gold watch" className="watch-img" width={1024} height={1024} loading="lazy" />
          </div>
          <div className="section dark">
            <h2>Rear turbines.</h2>
            <p>Power with a quieter profile.</p>
            <img src={watchSteel} data-tone="steel" alt="Luxury steel dive watch" className="watch-img" width={1024} height={1024} loading="lazy" />
          </div>
          <WatchCollection />
        </div>
      </div>
    </div>
  );
}
