/**
 * Space Background with Dynamic Constellations
 * Inspired by Pillars of Creation
 * Features:
 * - Glowing stars with slow pulsation
 * - Dynamic constellation lines that appear/disappear slowly
 * - Nebula clouds with subtle motion
 * - Fully responsive canvas background
 */

(function() {
    // ==========================
    // Configuration
    // ==========================
    const CONFIG = {
        STAR_COUNT: 550,
        CONSTELLATION_STAR_COUNT: 55,    // Number of stars used for constellation lines
        CONSTELLATION_UPDATE_INTERVAL: 24000, // ms (24 seconds)
        LINE_FADE_SPEED: 0.018,          // Per-frame opacity transition speed
        GLOW_PULSE_SPEED: 0.003,          // Slow global glow pulse speed
        MAX_LINE_DISTANCE_RATIO: 0.22,    // Max line length relative to min dimension
        EXTRA_RANDOM_EDGES: 12,           // Additional random connections for visual richness
        STAR_MIN_RADIUS: 0.8,
        STAR_MAX_RADIUS: 2.3,
        NEBULA_LAYERS: 6
    };

    // DOM elements
    let canvas;
    let ctx;

    // Data structures
    let stars = [];            // Array of star objects {x, y, radius, brightness, color}
    let edges = [];            // Array of {fromIdx, toIdx, opacity, targetOpacity}
    let constellationStarIndices = []; // Indices of stars used in current constellation pattern

    // Animation & timing
    let animationId = null;
    let resizeTimeout = null;
    let constellationInterval = null;
    let time = 0;              // For slow pulsation effects

    // Nebula animation offsets
    let nebulaOffsets = [];

    // ==========================
    // Helper Functions
    // ==========================
    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    // Generate star color (mostly white with slight blue/red/orange tints)
    function getStarColor(brightness) {
        const rand = Math.random();
        if (rand < 0.7) {
            return `rgba(255, 255, 255, ${brightness})`;
        } else if (rand < 0.85) {
            return `rgba(210, 220, 255, ${brightness})`; // cool blue
        } else {
            return `rgba(255, 230, 210, ${brightness})`; // warm orange
        }
    }

    // Initialize stars with random positions and properties
    function initStars(width, height) {
        const starsArray = [];
        for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
            const radius = randomRange(CONFIG.STAR_MIN_RADIUS, CONFIG.STAR_MAX_RADIUS);
            const brightness = randomRange(0.45, 1.0);
            starsArray.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: radius,
                baseRadius: radius,
                brightness: brightness,
                color: getStarColor(brightness)
            });
        }
        return starsArray;
    }

    // Select which stars become "constellation stars" (brighter stars + random)
    function selectConstellationStars(starList, count) {
        // Weight by brightness: brighter stars more likely to be selected
        const weightedIndices = [];
        for (let i = 0; i < starList.length; i++) {
            const weight = starList[i].brightness ** 1.5;
            for (let j = 0; j < Math.floor(weight * 10) + 1; j++) {
                weightedIndices.push(i);
            }
        }
        // Shuffle and take unique indices
        const shuffled = [...weightedIndices];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const selected = new Set();
        for (let idx of shuffled) {
            selected.add(idx);
            if (selected.size >= count) break;
        }
        // If we don't have enough, add random stars
        if (selected.size < count) {
            const allIndices = Array.from({length: starList.length}, (_, i) => i);
            for (let idx of allIndices) {
                selected.add(idx);
                if (selected.size >= count) break;
            }
        }
        return Array.from(selected);
    }

    // Compute edges (connections) for given set of constellation stars
    function computeEdgesForConstellation(starList, constellationIndices, width, height) {
        const edgesSet = new Set(); // use string "from,to" for uniqueness
        const edgesList = [];
        const maxDist = Math.min(width, height) * CONFIG.MAX_LINE_DISTANCE_RATIO;

        // Helper to add edge (normalized order)
        function addEdge(i1, i2) {
            if (i1 === i2) return;
            const key = i1 < i2 ? `${i1},${i2}` : `${i2},${i1}`;
            if (edgesSet.has(key)) return;
            edgesSet.add(key);
            edgesList.push({ fromIdx: i1, toIdx: i2 });
        }

        // Build spatial index for constellation stars
        const constStars = constellationIndices.map(idx => ({
            idx: idx,
            x: starList[idx].x,
            y: starList[idx].y
        }));

        // For each constellation star, connect to up to 2 nearest neighbors within maxDist
        for (let i = 0; i < constStars.length; i++) {
            const starA = constStars[i];
            const distances = [];
            for (let j = 0; j < constStars.length; j++) {
                if (i === j) continue;
                const starB = constStars[j];
                const dx = starA.x - starB.x;
                const dy = starA.y - starB.y;
                const dist = Math.hypot(dx, dy);
                if (dist < maxDist) {
                    distances.push({ idx: j, dist: dist });
                }
            }
            distances.sort((a,b) => a.dist - b.dist);
            // Connect to up to 2 nearest
            const connections = distances.slice(0, 2);
            for (let conn of connections) {
                addEdge(starA.idx, constStars[conn.idx].idx);
            }
        }

        // Ensure no isolated constellation stars: each star must have at least 1 connection
        const connectedStars = new Set();
        for (let edge of edgesList) {
            connectedStars.add(edge.fromIdx);
            connectedStars.add(edge.toIdx);
        }
        for (let idx of constellationIndices) {
            if (!connectedStars.has(idx)) {
                // Find nearest constellation neighbor
                let nearestIdx = null;
                let minDist = Infinity;
                for (let otherIdx of constellationIndices) {
                    if (otherIdx === idx) continue;
                    const dx = starList[idx].x - starList[otherIdx].x;
                    const dy = starList[idx].y - starList[otherIdx].y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestIdx = otherIdx;
                    }
                }
                if (nearestIdx !== null) {
                    addEdge(idx, nearestIdx);
                }
            }
        }

        // Add extra random edges for aesthetic (between constellation stars)
        const extraAttempts = CONFIG.EXTRA_RANDOM_EDGES;
        for (let attempt = 0; attempt < extraAttempts; attempt++) {
            const i = Math.floor(Math.random() * constellationIndices.length);
            const j = Math.floor(Math.random() * constellationIndices.length);
            if (i !== j) {
                const idxA = constellationIndices[i];
                const idxB = constellationIndices[j];
                const dx = starList[idxA].x - starList[idxB].x;
                const dy = starList[idxA].y - starList[idxB].y;
                const dist = Math.hypot(dx, dy);
                if (dist < maxDist * 1.1) {
                    addEdge(idxA, idxB);
                }
            }
        }

        return edgesList;
    }

    // Update constellation pattern: new stars, new target edges, fade transition
    function updateConstellationPattern(width, height) {
        if (!stars.length) return;

        // 1. Select new set of constellation stars
        const newConstIndices = selectConstellationStars(stars, CONFIG.CONSTELLATION_STAR_COUNT);
        constellationStarIndices = newConstIndices;

        // 2. Compute new desired edges
        const newRawEdges = computeEdgesForConstellation(stars, constellationStarIndices, width, height);
        
        // Create a set for quick lookup of new edges
        const newEdgeKeySet = new Set();
        for (let edge of newRawEdges) {
            const key = edge.fromIdx < edge.toIdx ? `${edge.fromIdx},${edge.toIdx}` : `${edge.toIdx},${edge.fromIdx}`;
            newEdgeKeySet.add(key);
        }

        // 3. Merge with existing edges: update targetOpacity
        // First, mark all existing edges to fade out unless they are in new set
        for (let edge of edges) {
            const key = edge.fromIdx < edge.toIdx ? `${edge.fromIdx},${edge.toIdx}` : `${edge.toIdx},${edge.fromIdx}`;
            if (newEdgeKeySet.has(key)) {
                edge.targetOpacity = 1.0;
            } else {
                edge.targetOpacity = 0.0;
            }
        }

        // 4. Add new edges that don't exist yet
        for (let newEdge of newRawEdges) {
            const exists = edges.some(e => 
                (e.fromIdx === newEdge.fromIdx && e.toIdx === newEdge.toIdx) ||
                (e.fromIdx === newEdge.toIdx && e.toIdx === newEdge.fromIdx)
            );
            if (!exists) {
                edges.push({
                    fromIdx: newEdge.fromIdx,
                    toIdx: newEdge.toIdx,
                    opacity: 0.0,
                    targetOpacity: 1.0
                });
            }
        }

        // Optional: clean up edges that have very low opacity and target zero for long
        edges = edges.filter(edge => edge.opacity > 0.01 || edge.targetOpacity > 0.01);
    }

    // Draw glowing nebula clouds (Pillars of Creation vibe)
    function drawNebula(width, height, timeVal) {
        // Create radial gradients for cosmic clouds
        const gradients = [
            { color1: 'rgba(80, 40, 100, 0.2)', color2: 'rgba(30, 20, 60, 0.0)', radius: 0.4 },
            { color1: 'rgba(60, 30, 90, 0.18)', color2: 'rgba(20, 10, 40, 0.0)', radius: 0.45 },
            { color1: 'rgba(100, 50, 70, 0.15)', color2: 'rgba(40, 20, 30, 0.0)', radius: 0.35 },
            { color1: 'rgba(40, 60, 100, 0.16)', color2: 'rgba(10, 20, 50, 0.0)', radius: 0.5 },
            { color1: 'rgba(130, 70, 40, 0.12)', color2: 'rgba(50, 30, 10, 0.0)', radius: 0.3 },
            { color1: 'rgba(70, 90, 130, 0.14)', color2: 'rgba(20, 30, 60, 0.0)', radius: 0.48 }
        ];

        for (let i = 0; i < gradients.length && i < CONFIG.NEBULA_LAYERS; i++) {
            const grad = gradients[i];
            const offX = nebulaOffsets[i]?.x || 0;
            const offY = nebulaOffsets[i]?.y || 0;
            const centerX = width * (0.3 + 0.4 * Math.sin(timeVal * 0.0005 + i)) + offX;
            const centerY = height * (0.5 + 0.2 * Math.cos(timeVal * 0.0003 + i * 2)) + offY;
            const maxRadius = Math.max(width, height) * grad.radius;
            
            const radialGrd = ctx.createRadialGradient(centerX, centerY, maxRadius * 0.2, centerX, centerY, maxRadius);
            radialGrd.addColorStop(0, grad.color1);
            radialGrd.addColorStop(1, grad.color2);
            
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = radialGrd;
            ctx.beginPath();
            ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // Update nebula offset positions (slow drifting)
    function updateNebulaOffsets() {
        for (let i = 0; i < CONFIG.NEBULA_LAYERS; i++) {
            if (!nebulaOffsets[i]) {
                nebulaOffsets[i] = { x: 0, y: 0, speedX: randomRange(-0.05, 0.05), speedY: randomRange(-0.05, 0.05) };
            }
            nebulaOffsets[i].x += nebulaOffsets[i].speedX * 0.3;
            nebulaOffsets[i].y += nebulaOffsets[i].speedY * 0.3;
            // Wrap around subtly
            if (Math.abs(nebulaOffsets[i].x) > 80) nebulaOffsets[i].speedX *= -0.95;
            if (Math.abs(nebulaOffsets[i].y) > 80) nebulaOffsets[i].speedY *= -0.95;
        }
    }

    // Draw all stars with pulsating glow
    function drawStars(width, height, glowIntensity) {
        for (let star of stars) {
            // Pulsate brightness slightly based on global time
            const pulsation = 0.7 + 0.3 * Math.sin(time * CONFIG.GLOW_PULSE_SPEED + star.brightness * 10);
            const alpha = Math.min(star.brightness * (0.7 + glowIntensity * 0.5) * pulsation, 0.95);
            
            // Outer glow (soft halo)
            ctx.shadowBlur = star.radius * 3.5 + 2;
            ctx.shadowColor = `rgba(255, 240, 200, ${alpha * 0.7})`;
            
            // Inner core
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = star.color.replace(/[\d\.]+\)$/g, `${alpha})`);
            ctx.fill();
            
            // Extra bright core for larger stars
            if (star.radius > 1.5) {
                ctx.shadowBlur = star.radius * 2;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 245, 210, ${alpha * 0.9})`;
                ctx.fill();
            }
        }
        // Reset shadow to avoid affecting lines
        ctx.shadowBlur = 0;
    }

    // Draw constellation lines with glow and dynamic opacity
    function drawConstellationLines() {
        if (edges.length === 0) return;
        
        ctx.save();
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(255, 255, 230, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        
        for (let edge of edges) {
            if (edge.opacity <= 0.01) continue;
            
            const fromStar = stars[edge.fromIdx];
            const toStar = stars[edge.toIdx];
            if (!fromStar || !toStar) continue;
            
            ctx.beginPath();
            ctx.moveTo(fromStar.x, fromStar.y);
            ctx.lineTo(toStar.x, toStar.y);
            
            // Opacity with subtle pulsation
            const lineAlpha = Math.min(edge.opacity * (0.7 + 0.3 * Math.sin(time * 0.002)), 0.85);
            ctx.strokeStyle = `rgba(255, 245, 210, ${lineAlpha})`;
            ctx.stroke();
        }
        ctx.restore();
    }

    // Update edge opacities (smooth fade toward target)
    function updateEdgeOpacities() {
        let anyChange = false;
        for (let edge of edges) {
            const diff = edge.targetOpacity - edge.opacity;
            if (Math.abs(diff) > 0.002) {
                edge.opacity += diff * CONFIG.LINE_FADE_SPEED;
                anyChange = true;
            } else {
                edge.opacity = edge.targetOpacity;
            }
        }
        // Clean up edges that faded out completely and have target 0
        if (!anyChange) {
            edges = edges.filter(edge => edge.opacity > 0.01 || edge.targetOpacity > 0.01);
        }
    }

    // Resize handler: resize canvas, regenerate stars and constellations
    function handleResize() {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            
            // Regenerate everything on resize
            stars = initStars(width, height);
            constellationStarIndices = selectConstellationStars(stars, CONFIG.CONSTELLATION_STAR_COUNT);
            const newEdgesRaw = computeEdgesForConstellation(stars, constellationStarIndices, width, height);
            edges = newEdgesRaw.map(edge => ({
                fromIdx: edge.fromIdx,
                toIdx: edge.toIdx,
                opacity: 0.5,      // Start partially visible
                targetOpacity: 0.8
            }));
            
            // Re-start dynamic pattern updates (clear old interval, start fresh)
            if (constellationInterval) clearInterval(constellationInterval);
            constellationInterval = setInterval(() => {
                if (stars.length && canvas) {
                    updateConstellationPattern(canvas.width, canvas.height);
                }
            }, CONFIG.CONSTELLATION_UPDATE_INTERVAL);
        }, 150);
    }

    // Main animation render loop
    function animate() {
        if (!canvas || !ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        if (width === 0 || height === 0) return;
        
        // Increment global time for pulsations
        time = (time + 1) % (Math.PI * 2000);
        
        // Calculate global glow intensity (very slow sine wave)
        const glowPulse = 0.6 + 0.35 * Math.sin(time * CONFIG.GLOW_PULSE_SPEED);
        
        // Clear canvas with deep space gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#03020f');
        gradient.addColorStop(0.5, '#0a0518');
        gradient.addColorStop(1, '#04020c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw nebulae (Pillars of Creation style)
        updateNebulaOffsets();
        drawNebula(width, height, time);
        
        // Update constellation line opacities (fade in/out)
        updateEdgeOpacities();
        
        // Draw constellation lines first (behind stars)
        drawConstellationLines();
        
        // Draw stars with glow
        drawStars(width, height, glowPulse);
        
        // Additional very faint star dust (tiny dots) for depth
        ctx.fillStyle = 'rgba(255, 255, 245, 0.15)';
        for (let i = 0; i < stars.length * 0.3; i++) {
            // Not performance heavy, just adds atmosphere
            if (Math.random() < 0.05) {
                ctx.beginPath();
                ctx.arc(Math.random() * width, Math.random() * height, 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }

    // Initialize the background system
    function initBackground() {
        // Create canvas if not exists (assume it's not provided in HTML, but we'll create it)
        canvas = document.createElement('canvas');
        canvas.id = 'space-pillars-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '-2';
        canvas.style.pointerEvents = 'none';
        document.body.insertBefore(canvas, document.body.firstChild);
        
        ctx = canvas.getContext('2d');
        
        // Initial sizing
        handleResize();
        
        // Start animation
        animate();
        
        // Listen for resize events
        window.addEventListener('resize', handleResize);
    }

    // Start when page is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackground);
    } else {
        initBackground();
    }
})();
