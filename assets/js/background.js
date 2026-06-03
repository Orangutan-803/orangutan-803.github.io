<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Cosmic Canvas - Pillars of Creation Style Background</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            user-select: none;
        }

        body {
            background: #03020a;
            min-height: 100vh;
            overflow: hidden;
            font-family: 'Segoe UI', 'Arial', sans-serif;
        }

        canvas {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
        }

        /* Optional subtle overlay text to show theme, but not intrusive */
        .info {
            position: fixed;
            bottom: 16px;
            right: 20px;
            color: rgba(210, 210, 240, 0.4);
            font-size: 12px;
            font-family: monospace;
            pointer-events: none;
            z-index: 10;
            letter-spacing: 1px;
            backdrop-filter: blur(2px);
            background: rgba(0,0,0,0.3);
            padding: 4px 12px;
            border-radius: 30px;
        }
        
        @media (max-width: 600px) {
            .info { font-size: 9px; bottom: 8px; right: 8px; }
        }
    </style>
</head>
<body>
    <canvas id="cosmicCanvas"></canvas>
    <div class="info">✦ PILLARS OF CREATION • NEBULA GLOW • DYNAMIC CONSTELLATIONS ✦</div>

    <script>
        (function() {
            // ---------- CONFIGURATION ----------
            const canvas = document.getElementById('cosmicCanvas');
            let ctx = canvas.getContext('2d');
            
            // Visual parameters
            const STAR_COUNT = 520;              // total stars for rich field
            const CONSTELLATION_STAR_RATIO = 0.28; // 28% of stars become potential constellation nodes (brightest ones)
            const GLOW_CYCLE_DURATION = 18000;    // ms for full pulsation cycle (very slow)
            const CONSTELLATION_UPDATE_INTERVAL = 21000; // ms between constellation line changes (dynamic)
            const FADE_TRANSITION_SPEED = 0.07;   // alpha transition speed per frame
            
            // Nebula / Pillars color palette
            const NEBULA_COLORS = [
                'rgba(80, 40, 90, 0.28)',   // deep violet
                'rgba(140, 70, 100, 0.24)',  // rust nebula
                'rgba(200, 110, 80, 0.18)',  // golden dust
                'rgba(30, 20, 55, 0.4)',     // dark cosmic fog
                'rgba(210, 130, 70, 0.2)'    // warm pillar glow
            ];
            
            // Dynamic global data
            let stars = [];                // { x, y, radius, brightness, color, baseGlow }
            let constellationStarIndices = [];   // indices in stars[] that are "bright" (constellation candidates)
            let edges = [];                // { fromIdx, toIdx, alpha, targetAlpha }
            let newEdgesPending = false;
            let transitionActive = false;
            let lastTimestamp = 0;
            let animationFrameId = null;
            let resizeTimeout = null;
            
            // For smooth pulsing glow (overall cosmic breath)
            let globalPulse = 1.0;
            let pulseStartTime = performance.now();
            
            // ---------- UTILITIES ----------
            function randomRange(min, max) {
                return min + Math.random() * (max - min);
            }
            
            // Euclidian distance helper
            function distance(ax, ay, bx, by) {
                const dx = ax - bx;
                const dy = ay - by;
                return Math.hypot(dx, dy);
            }
            
            // ---------- GENERATE STARS (Pillars of Creation style: varied colors, glow potential) ----------
            function generateStars(w, h) {
                const newStars = [];
                for (let i = 0; i < STAR_COUNT; i++) {
                    // position spread across canvas, slightly clustered towards center for nebula depth
                    let x, y;
                    if (Math.random() < 0.7) {
                        x = randomRange(w * 0.1, w * 0.9);
                        y = randomRange(h * 0.1, h * 0.9);
                    } else {
                        x = randomRange(0, w);
                        y = randomRange(0, h);
                    }
                    
                    // radius: mix of tiny and medium stars (bright stars bigger)
                    let radius = randomRange(0.7, 2.2);
                    // randomly create some slightly larger "giant" stars (for constellation anchors)
                    if (Math.random() < 0.08) radius = randomRange(2.5, 3.8);
                    
                    // brightness factor 0.3 .. 1.0, influences star core glow
                    const brightness = randomRange(0.4, 1.0);
                    
                    // star color: mostly white/blueish, but some warm golden/reddish for pillars mood
                    let color;
                    const colorRand = Math.random();
                    if (colorRand < 0.7) {
                        // cool white / pale blue
                        const intensity = 200 + Math.floor(55 * brightness);
                        color = `rgb(${intensity}, ${intensity + 20}, 255)`;
                    } else if (colorRand < 0.85) {
                        // warm golden / orange
                        const r = 220 + Math.floor(35 * brightness);
                        const g = 160 + Math.floor(60 * brightness);
                        const b = 80 + Math.floor(40 * brightness);
                        color = `rgb(${r}, ${g}, ${b})`;
                    } else {
                        // subtle red giant
                        color = `rgb(245, 140, 110)`;
                    }
                    
                    newStars.push({
                        x, y, radius,
                        brightness: brightness,
                        color: color,
                        baseGlow: 0.5 + brightness * 0.5
                    });
                }
                return newStars;
            }
            
            // determine which stars become part of dynamic constellations (top brightest / larger radius)
            function selectConstellationStars(starsArray) {
                // sort by radius * brightness to get visually significant stars
                const indexed = starsArray.map((star, idx) => ({ idx, weight: star.radius * star.brightness }));
                indexed.sort((a, b) => b.weight - a.weight);
                const takeCount = Math.max(25, Math.floor(starsArray.length * CONSTELLATION_STAR_RATIO));
                const selectedIndices = indexed.slice(0, takeCount).map(item => item.idx);
                // sort again for deterministic order (not needed but clean)
                selectedIndices.sort((a,b) => a - b);
                return selectedIndices;
            }
            
            // generate new constellation edges based on current selected stars & canvas dimensions (dynamic)
            // returns array of { fromIdx, toIdx } where indices are positions in constellationStarIndices
            function generateConstellationEdges(constIndices, starsArray, canvasW, canvasH) {
                if (constIndices.length < 5) return [];
                
                // map constellation points positions
                const points = constIndices.map(idx => ({
                    x: starsArray[idx].x,
                    y: starsArray[idx].y,
                    idx: idx,
                }));
                
                const edgesSet = new Set(); // avoid duplicate edges (key: "a,b")
                const newEdgesList = [];
                
                // 1. connect each star to 1~3 nearest neighbours (based on distance, creating organic web)
                const MAX_NEIGH = 3;
                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    // compute distances to all others
                    const distances = [];
                    for (let j = 0; j < points.length; j++) {
                        if (i === j) continue;
                        const d = distance(p.x, p.y, points[j].x, points[j].y);
                        distances.push({ idx: j, dist: d });
                    }
                    distances.sort((a,b) => a.dist - b.dist);
                    const neighborsCount = Math.min(MAX_NEIGH, distances.length);
                    for (let k = 0; k < neighborsCount; k++) {
                        const neighbor = distances[k];
                        // avoid lines that are too long (spaghetti) unless it's a intentional longer line
                        const maxDistAllowed = Math.min(canvasW, canvasH) * 0.28;
                        if (neighbor.dist < maxDistAllowed || Math.random() < 0.25) {
                            const key = `${Math.min(i, neighbor.idx)}-${Math.max(i, neighbor.idx)}`;
                            if (!edgesSet.has(key)) {
                                edgesSet.add(key);
                                newEdgesList.push({ fromIdx: i, toIdx: neighbor.idx });
                            }
                        }
                    }
                }
                
                // 2. add a few "mythical" longer connections to create recognizable constellation shapes (triangles)
                const extraEdgesCount = Math.min(12, Math.floor(points.length * 0.2));
                for (let e = 0; e < extraEdgesCount; e++) {
                    let a = Math.floor(Math.random() * points.length);
                    let b = Math.floor(Math.random() * points.length);
                    if (a === b) continue;
                    const key = `${Math.min(a,b)}-${Math.max(a,b)}`;
                    if (!edgesSet.has(key)) {
                        edgesSet.add(key);
                        newEdgesList.push({ fromIdx: a, toIdx: b });
                    }
                }
                
                // 3. (Optional) remove stray edges that are too extremely long > 45% of canvas diagonal
                const maxDiag = Math.hypot(canvasW, canvasH) * 0.45;
                const filtered = newEdgesList.filter(edge => {
                    const p1 = points[edge.fromIdx];
                    const p2 = points[edge.toIdx];
                    const d = distance(p1.x, p1.y, p2.x, p2.y);
                    return d < maxDiag;
                });
                
                // return edge objects with constellation-relative indices
                return filtered;
            }
            
            // rebuild entire cosmic scene: stars and constellation lines
            function rebuildScene(w, h) {
                stars = generateStars(w, h);
                constellationStarIndices = selectConstellationStars(stars);
                // generate initial edges
                const initialEdgesRaw = generateConstellationEdges(constellationStarIndices, stars, w, h);
                edges = initialEdgesRaw.map(edge => ({
                    fromIdx: edge.fromIdx,
                    toIdx: edge.toIdx,
                    alpha: 1.0,
                    targetAlpha: 1.0
                }));
                newEdgesPending = false;
                transitionActive = false;
            }
            
            // ----- dynamic transition: slowly fade out old constellation lines, fade in new set -----
            function scheduleConstellationUpdate(canvasW, canvasH) {
                if (!stars.length) return;
                // set all current edges to fade out
                for (let edge of edges) {
                    edge.targetAlpha = 0.0;
                }
                transitionActive = true;
                newEdgesPending = true;  // mark that after fade we need to generate fresh edges
                // actual generation will happen in animation loop once edges are nearly invisible
            }
            
            // generate brand new edges to replace old ones after fade out
            function replaceWithNewEdges(canvasW, canvasH) {
                if (!constellationStarIndices.length) return [];
                const freshRaw = generateConstellationEdges(constellationStarIndices, stars, canvasW, canvasH);
                const newEdgesList = freshRaw.map(edge => ({
                    fromIdx: edge.fromIdx,
                    toIdx: edge.toIdx,
                    alpha: 0.0,
                    targetAlpha: 0.95 + Math.random() * 0.05  // slightly varied for organic look
                }));
                return newEdgesList;
            }
            
            // ---------- DRAWING FUNCTIONS (NEBULA, STARS, GLOWING LINES) ----------
            
            // draw deep space + nebula pillars inspired by Pillars of Creation (dusty, warm & violet clouds)
            function drawNebulaBackground(ctx, w, h, pulseFactor) {
                // Base gradient - deep cosmos
                const grad = ctx.createLinearGradient(0, 0, w * 0.8, h);
                grad.addColorStop(0, '#030218');
                grad.addColorStop(0.5, '#0c0525');
                grad.addColorStop(1, '#1b0a2e');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
                
                // Pillars style: layered soft glow clouds (blurred translucent shapes)
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                // dynamic nebula intensity based on global pulse (slow breathe)
                const nebulaIntensity = 0.6 + pulseFactor * 0.35;
                
                for (let i = 0; i < 18; i++) {
                    const cloudX = w * (0.2 + Math.sin(i * 0.9) * 0.3);
                    const cloudY = h * (0.4 + Math.cos(i * 0.7) * 0.35);
                    const radiusX = w * randomRange(0.12, 0.28);
                    const radiusY = h * randomRange(0.1, 0.22);
                    const colorChoice = NEBULA_COLORS[i % NEBULA_COLORS.length];
                    // rotate for pillar-like vertical elongation in some regions
                    ctx.save();
                    ctx.beginPath();
                    ctx.ellipse(cloudX, cloudY, radiusX, radiusY * (i % 2 === 0 ? 1.6 : 0.9), Math.PI * 0.15, 0, Math.PI * 2);
                    ctx.fillStyle = colorChoice;
                    ctx.filter = `blur(${Math.floor(24 + Math.sin(i) * 8)}px)`;
                    ctx.globalAlpha = nebulaIntensity * (0.5 + Math.sin(Date.now() * 0.0004 + i) * 0.2);
                    ctx.fill();
                    ctx.restore();
                }
                
                // Extra vertical "pillar" reminiscent shapes with warm hues
                ctx.filter = `blur(32px)`;
                ctx.globalAlpha = (0.3 + pulseFactor * 0.2) * 0.8;
                ctx.fillStyle = 'rgba(160, 80, 55, 0.3)';
                ctx.beginPath();
                ctx.ellipse(w * 0.3, h * 0.6, w * 0.12, h * 0.45, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(220, 120, 70, 0.28)';
                ctx.beginPath();
                ctx.ellipse(w * 0.7, h * 0.45, w * 0.1, h * 0.5, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(100, 55, 110, 0.35)';
                ctx.beginPath();
                ctx.ellipse(w * 0.5, h * 0.75, w * 0.18, h * 0.3, -0.2, 0, Math.PI * 2);
                ctx.fill();
                
                // reset filter and composite
                ctx.filter = 'none';
                ctx.globalCompositeOperation = 'source-over';
                ctx.restore();
                
                // add subtle tiny dust particles (extra stars effect not in star array)
                ctx.fillStyle = 'rgba(210, 210, 240, 0.25)';
                for (let d = 0; d < 180; d++) {
                    if (Math.random() > 0.7) continue;
                    ctx.beginPath();
                    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // draw stars with soft inner glow and pulsing brightness
            function drawStars(ctx, starsArray, pulseFactor, w, h) {
                for (let star of starsArray) {
                    const glowStrength = star.brightness * (0.7 + pulseFactor * 0.45);
                    const coreAlpha = Math.min(0.95, 0.55 + star.brightness * 0.5) * (0.8 + pulseFactor * 0.35);
                    // draw outer glow (larger soft circle)
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.radius * 1.6, 0, Math.PI * 2);
                    ctx.fillStyle = star.color;
                    ctx.globalAlpha = 0.25 * glowStrength;
                    ctx.fill();
                    // inner glow
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.radius * 0.9, 0, Math.PI * 2);
                    ctx.fillStyle = star.color;
                    ctx.globalAlpha = 0.6 * glowStrength;
                    ctx.fill();
                    // core
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.radius * 0.6, 0, Math.PI * 2);
                    ctx.fillStyle = star.color;
                    ctx.globalAlpha = coreAlpha;
                    ctx.fill();
                    
                    // occasional extra spark on brightest stars
                    if (star.brightness > 0.8 && star.radius > 1.4) {
                        ctx.beginPath();
                        ctx.arc(star.x - 0.8, star.y - 0.8, star.radius * 0.25, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(255, 210, 180, 0.7)';
                        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.002) * 0.2;
                        ctx.fill();
                    }
                }
                ctx.globalAlpha = 1.0;
            }
            
            // draw constellation lines: glowing white, dynamic alpha (fade in/out), with beautiful soft glow
            function drawConstellationLines(ctx, edgesArray, starsArray, constIndices, pulseFactor, canvasW, canvasH) {
                if (!edgesArray.length) return;
                ctx.save();
                ctx.lineCap = 'round';
                ctx.shadowBlur = 0; // start without shadow, we use layering for glow
                
                // For each edge, draw with current alpha (transition fading)
                for (let edge of edgesArray) {
                    const currentAlpha = Math.min(1.0, Math.max(0, edge.alpha));
                    if (currentAlpha <= 0.005) continue;
                    
                    const starAIdx = constIndices[edge.fromIdx];
                    const starBIdx = constIndices[edge.toIdx];
                    if (starAIdx === undefined || starBIdx === undefined) continue;
                    const starA = starsArray[starAIdx];
                    const starB = starsArray[starBIdx];
                    if (!starA || !starB) continue;
                    
                    const x1 = starA.x, y1 = starA.y;
                    const x2 = starB.x, y2 = starB.y;
                    
                    // dynamic line intensity based on global pulse and edge's own alpha
                    const lineIntensity = (0.55 + pulseFactor * 0.55) * currentAlpha;
                    
                    // 1) outer glow (soft, thicker line with blur)
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.lineWidth = 3.6;
                    ctx.strokeStyle = `rgba(255, 240, 210, ${0.18 * lineIntensity})`;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(255, 240, 200, 0.7)';
                    ctx.stroke();
                    
                    // 2) core white glowing line
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.lineWidth = 1.8;
                    ctx.strokeStyle = `rgba(255, 255, 245, ${0.7 * lineIntensity})`;
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = 'rgba(255, 220, 160, 0.9)';
                    ctx.stroke();
                    
                    // 3) very bright central core (thin, intense)
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.lineWidth = 0.8;
                    ctx.strokeStyle = `rgba(255, 255, 220, ${0.9 * lineIntensity})`;
                    ctx.shadowBlur = 3;
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                ctx.restore();
            }
            
            // update edge alpha values smoothly according to targetAlpha (transition effect)
            function updateEdgesAlpha(edgesArray) {
                let anyTransition = false;
                for (let i = 0; i < edgesArray.length; i++) {
                    const e = edgesArray[i];
                    if (Math.abs(e.alpha - e.targetAlpha) > 0.002) {
                        anyTransition = true;
                        e.alpha += (e.targetAlpha - e.alpha) * FADE_TRANSITION_SPEED;
                        if (Math.abs(e.alpha - e.targetAlpha) < 0.003) e.alpha = e.targetAlpha;
                        e.alpha = Math.min(1.0, Math.max(0, e.alpha));
                    } else {
                        e.alpha = e.targetAlpha;
                    }
                }
                return anyTransition;
            }
            
            // ----- MAIN ANIMATION LOOP + DYNAMIC CONSTELLATION REPLACEMENT -----
            let lastFrameTime = 0;
            let constellationTimer = 0;
            let lastConstellationUpdate = performance.now();
            
            function animate(timestamp) {
                if (!ctx) return;
                const w = canvas.width;
                const h = canvas.height;
                if (w === 0 || h === 0) {
                    animationFrameId = requestAnimationFrame(animate);
                    return;
                }
                
                // Slow global pulsation (20 sec cycle approx)
                const now = performance.now();
                const cycleSec = (now * 0.00028) % (Math.PI * 2);
                globalPulse = 0.62 + 0.32 * Math.sin(cycleSec);   // range 0.3 to 0.94 smooth
                const pulseForGlow = globalPulse;
                
                // ---------- DYNAMIC CONSTELLATION REPLACEMENT LOGIC ----------
                // check if we need to trigger new constellation (every CONSTELLATION_UPDATE_INTERVAL)
                if (!newEdgesPending && stars.length && constellationStarIndices.length) {
                    if (now - lastConstellationUpdate > CONSTELLATION_UPDATE_INTERVAL) {
                        // trigger fade-out of existing edges
                        for (let e of edges) {
                            e.targetAlpha = 0.0;
                        }
                        newEdgesPending = true;
                        transitionActive = true;
                        lastConstellationUpdate = now;
                    }
                }
                
                // If fading out edges are nearly all gone, generate new edges
                if (newEdgesPending && edges.length > 0) {
                    const allAlmostZero = edges.every(e => e.alpha <= 0.02);
                    if (allAlmostZero) {
                        // remove old edges
                        edges = [];
                        // generate fresh constellation lines
                        const freshEdges = replaceWithNewEdges(w, h);
                        edges = freshEdges;
                        newEdgesPending = false;
                        transitionActive = false;
                        // edges now have alpha 0 and target alpha ~0.95, so they will fade in
                    }
                } else if (newEdgesPending && edges.length === 0) {
                    // if somehow edges empty but pending, generate immediately
                    const freshEdges = replaceWithNewEdges(w, h);
                    edges = freshEdges;
                    newEdgesPending = false;
                    transitionActive = false;
                }
                
                // smoothly interpolate edge alphas
                if (edges.length) {
                    updateEdgesAlpha(edges);
                }
                
                // ---------- DRAW EVERYTHING ----------
                ctx.clearRect(0, 0, w, h);
                
                // 1) Nebula & Pillars background (deep space)
                drawNebulaBackground(ctx, w, h, pulseForGlow);
                
                // 2) Draw all stars (with pulsating glow)
                drawStars(ctx, stars, pulseForGlow, w, h);
                
                // 3) Draw glowing constellation lines (dynamic lines appear/disappear slowly)
                if (edges.length > 0 && constellationStarIndices.length) {
                    drawConstellationLines(ctx, edges, stars, constellationStarIndices, pulseForGlow, w, h);
                }
                
                // optional: extra glitter on bright stars - tiny floating light motes
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(255, 210, 150, 0.2)';
                for (let i = 0; i < 70; i++) {
                    if (Math.random() > 0.95) {
                        ctx.beginPath();
                        ctx.arc(Math.random() * w, Math.random() * h, 1.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.globalCompositeOperation = 'source-over';
                
                animationFrameId = requestAnimationFrame(animate);
            }
            
            // ---------- RESIZE HANDLER: regenerate all stars and lines based on new dimensions ----------
            function handleResize() {
                if (resizeTimeout) clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    const w = window.innerWidth;
                    const h = window.innerHeight;
                    canvas.width = w;
                    canvas.height = h;
                    if (ctx) {
                        // reset context filters
                        ctx.filter = 'none';
                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                    }
                    // fully regenerate scene for new dimensions
                    rebuildScene(w, h);
                    // reset constellation update timers to avoid sudden jump
                    lastConstellationUpdate = performance.now();
                    newEdgesPending = false;
                    transitionActive = false;
                }, 120);
            }
            
            // ---------- INITIALIZATION ----------
            function init() {
                const w = window.innerWidth;
                const h = window.innerHeight;
                canvas.width = w;
                canvas.height = h;
                ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                rebuildScene(w, h);
                lastConstellationUpdate = performance.now();
                animationFrameId = requestAnimationFrame(animate);
                
                window.addEventListener('resize', handleResize);
            }
            
            // start everything
            init();
        })();
    </script>
</body>
</html>
