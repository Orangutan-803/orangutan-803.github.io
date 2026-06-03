var particleCount = 50;
var flareCount = 20;
var motion = 0.08;
var tilt = 0.05;
var colorPalette = ["#b33a1a", "#d45a1a", "#f07a1a", "#f09a3a", "#aa4a1a"]; // deeper, less saturated
var particleSizeBase = 3.5;
var particleSizeMultiplier = 0.9;
var flareSizeBase = 70;
var flareSizeMultiplier = 70;
var lineWidth = 1.2;
var linkChance = 45;
var linkLengthMin = 4;
var linkLengthMax = 7;
var linkOpacity = 0.35;      // more subtle
var linkFade = 80;           // slower fade out
var linkSpeed = 0.8;         // much slower link animation
var glareAngle = -60;
var glareOpacityMultiplier = 0.1;   // less glare intensity
var renderParticles = true;
var renderParticleGlare = true;
var renderFlares = true;
var renderLinks = true;
var renderMesh = false;
var flicker = true;
var flickerSmoothing = 40;    // higher = slower flicker (was 8)
var blurSize = 2;
var orbitTilt = true;
var randomMotion = true;
var noiseLength = 1000;
var noiseStrength = 1.2;

var canvas = document.getElementById("stars");
var context = canvas.getContext("2d");
var mouse = { x: 0, y: 0 };
var m = {};
var r = 0;
var c = 1000;
var n = 0;
var nAngle = 2 * Math.PI / noiseLength;
var nRad = 100;
var nScale = 0.5;
var nPos = { x: 0, y: 0 };
var points = [];
var vertices = [];
var triangles = [];
var links = [];
var particles = [];
var flares = [];
var EPSILON = 1 / 1048576;

function randomColor(t) { return t[Math.floor(Math.random() * t.length)]; }
function supertriangle(t) {
    var e, i, s, o, a, l, h = Number.POSITIVE_INFINITY, $ = Number.POSITIVE_INFINITY, f = Number.NEGATIVE_INFINITY, d = Number.NEGATIVE_INFINITY;
    for (e = t.length; e--;) t[e][0] < h && (h = t[e][0]), t[e][0] > f && (f = t[e][0]), t[e][1] < $ && ($ = t[e][1]), t[e][1] > d && (d = t[e][1]);
    o = Math.max(i = f - h, s = d - $);
    return [[(a = h + .5 * i) - 20 * o, (l = $ + .5 * s) - o], [a, l + 20 * o], [a + 20 * o, l - o]];
}
function circumcircle(t, e, i, s) {
    var o, a, l, h, $, f, d, u, v, p, g = t[e][0], _ = t[e][1], x = t[i][0], k = t[i][1], y = t[s][0], P = t[s][1], I = Math.abs(_ - k), b = Math.abs(k - P);
    if (I < EPSILON && b < EPSILON) throw Error("Eek! Coincident points!");
    if (I < EPSILON) {
        h = -((y - x) / (P - k));
        f = (x + y) / 2;
        u = (k + P) / 2;
        a = h * ((o = (x + g) / 2) - f) + u;
    } else if (b < EPSILON) {
        l = -((x - g) / (k - _));
        $ = (g + x) / 2;
        d = (_ + k) / 2;
        a = l * ((o = (y + x) / 2) - $) + d;
    } else {
        l = -((x - g) / (k - _));
        h = -((y - x) / (P - k));
        $ = (g + x) / 2;
        f = (x + y) / 2;
        d = (_ + k) / 2;
        o = (l * $ - h * f + (u = (k + P) / 2) - d) / (l - h);
        a = I > b ? l * (o - $) + d : h * (o - f) + u;
    }
    v = x - o;
    p = k - a;
    return { i: e, j: i, k: s, x: o, y: a, r: v * v + p * p };
}
function dedup(t) {
    var e, i, s, o, a, l;
    for (i = t.length; i;)
        for (o = t[--i], s = t[--i], e = i; e;)
            if (l = t[--e], s === (a = t[--e]) && o === l || s === l && o === a) {
                t.splice(i, 2);
                t.splice(e, 2);
                break;
            }
}
function Delaunay(t, e) {
    var i, s, o, a, l, h, $, f, d, u, v, p, g = t.length;
    if (g < 3) return [];
    if (t = t.slice(0), e) for (i = g; i--;) t[i] = t[i][e];
    for (o = Array(g), i = g; i--;) o[i] = i;
    for (o.sort(function(e, i) { return t[i][0] - t[e][0]; }), a = supertriangle(t), t.push(a[0], a[1], a[2]), l = [circumcircle(t, g + 0, g + 1, g + 2)], h = [], $ = [], i = o.length; i--; $.length = 0) {
        for (p = o[i], s = l.length; s--;) {
            if ((f = t[p][0] - l[s].x) > 0 && f * f > l[s].r) { h.push(l[s]); l.splice(s, 1); continue; }
            f * f + (d = t[p][1] - l[s].y) * d - l[s].r > EPSILON || ($.push(l[s].i, l[s].j, l[s].j, l[s].k, l[s].k, l[s].i), l.splice(s, 1));
        }
        for (dedup($), s = $.length; s;) v = $[--s], u = $[--s], l.push(circumcircle(t, u, v, p));
    }
    for (i = l.length; i--;) h.push(l[i]);
    for (l.length = 0, i = h.length; i--;) h[i].i < g && h[i].j < g && h[i].k < g && l.push(h[i].i, h[i].j, h[i].k);
    return l;
}

function init() {
    window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(t) { window.setTimeout(t, 1e3 / 60); };
    resize();
    mouse.x = canvas.clientWidth / 2;
    mouse.y = canvas.clientHeight / 2;
    for (var t = 0; t < particleCount; t++) {
        var s = new Particle();
        particles.push(s);
        points.push([s.x * c, s.y * c]);
    }
    vertices = Delaunay(points);
    var o = [];
    for (t = 0; t < vertices.length; t++) {
        if (3 == o.length) { triangles.push(o); o = []; }
        o.push(vertices[t]);
    }
    for (t = 0; t < particles.length; t++)
        for (var e = 0; e < triangles.length; e++)
            if (-1 !== (i = triangles[e].indexOf(t)))
                triangles[e].forEach(function(e, i, s) { e !== t && -1 == particles[t].neighbors.indexOf(e) && particles[t].neighbors.push(e); });
    if (renderFlares) for (t = 0; t < flareCount; t++) flares.push(new Flare());
    if ("ontouchstart" in document.documentElement && window.DeviceOrientationEvent)
        window.addEventListener("deviceorientation", function(t) {
            mouse.x = canvas.clientWidth / 2 - t.gamma / 90 * (canvas.clientWidth / 2) * 2;
            mouse.y = canvas.clientHeight / 2 - t.beta / 90 * (canvas.clientHeight / 2) * 2;
        }, true);
    else
        document.body.addEventListener("mousemove", function(t) { mouse.x = t.clientX; mouse.y = t.clientY; });
    (function t() {
        requestAnimFrame(t);
        resize();
        render();
    })();
}

function render() {
    if (randomMotion && (++n >= noiseLength && (n = 0), nPos = noisePoint(n)), context.clearRect(0, 0, canvas.width, canvas.height), blurSize > 0 && (context.shadowBlur = blurSize, context.shadowColor = randomColor(colorPalette)), renderParticles)
        for (var t = 0; t < particleCount; t++) particles[t].render();
    if (renderMesh) {
        context.beginPath();
        for (var e = 0; e < vertices.length - 1; e++)
            if ((e + 1) % 3 != 0) {
                var i = particles[vertices[e]], s = particles[vertices[e + 1]], o = position(i.x, i.y, i.z), a = position(s.x, s.y, s.z);
                context.moveTo(o.x, o.y);
                context.lineTo(a.x, a.y);
            }
        context.strokeStyle = randomColor(colorPalette);
        context.lineWidth = lineWidth;
        context.stroke();
        context.closePath();
    }
    if (renderLinks) {
        if (random(0, linkChance) == linkChance) {
            var l = random(linkLengthMin, linkLengthMax);
            startLink(random(0, particles.length - 1), l);
        }
        for (var h = links.length - 1; h >= 0; h--) links[h] && !links[h].finished ? links[h].render() : delete links[h];
    }
    if (renderFlares) for (var $ = 0; $ < flareCount; $++) flares[$].render();
}

function resize() {
    canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.width * (canvas.clientHeight / canvas.clientWidth);
}

function startLink(t, e) { links.push(new Link(t, e)); }

var Particle = function() {
    this.x = random(-0.1, 1.1, true);
    this.y = random(-0.1, 1.1, true);
    this.z = random(0, 4);
    this.color = randomColor(colorPalette);
    this.opacity = random(0.4, 0.9, true); // lower base opacity for dark mode
    this.flicker = 0;
    this.neighbors = [];
};

Particle.prototype.render = function() {
    var t = position(this.x, this.y, this.z);
    var e = (this.z * particleSizeMultiplier + particleSizeBase) * (sizeRatio() / 1000);
    var i = this.opacity;
    if (flicker) {
        var s = random(-0.3, 0.3, true); // smaller flicker amplitude
        this.flicker += (s - this.flicker) / flickerSmoothing;
        if (this.flicker > 0.3) this.flicker = 0.3;
        if (this.flicker < -0.3) this.flicker = -0.3;
        i += this.flicker;
        if (i > 1) i = 1;
        if (i < 0.2) i = 0.2;
    }
    context.fillStyle = this.color;
    context.globalAlpha = i;
    context.beginPath();
    context.arc(t.x, t.y, e, 0, 2 * Math.PI, false);
    context.fill();
    context.closePath();
    if (renderParticleGlare) {
        context.globalAlpha = i * glareOpacityMultiplier;
        context.ellipse(t.x, t.y, 100 * e, e, (glareAngle - (nPos.x - 0.5) * noiseStrength * motion) * (Math.PI / 180), 0, 2 * Math.PI, false);
        context.fill();
        context.closePath();
    }
    context.globalAlpha = 1;
};

var Flare = function() {
    this.x = random(-0.25, 1.25, true);
    this.y = random(-0.25, 1.25, true);
    this.z = random(0, 2);
    this.color = randomColor(colorPalette);
    this.opacity = random(0.003, 0.015, true); // more subtle
};

Flare.prototype.render = function() {
    var t = position(this.x, this.y, this.z);
    var e = (this.z * flareSizeMultiplier + flareSizeBase) * (sizeRatio() / 1000);
    context.beginPath();
    context.globalAlpha = this.opacity;
    context.arc(t.x, t.y, e, 0, 2 * Math.PI, false);
    context.fillStyle = this.color;
    context.fill();
    context.closePath();
    context.globalAlpha = 1;
};

var Link = function(t, e) {
    this.length = e;
    this.verts = [t];
    this.stage = 0;
    this.linked = [t];
    this.distances = [];
    this.traveled = 0;
    this.fade = 0;
    this.finished = false;
};

function noisePoint(t) {
    var e = nAngle * t;
    var i = nRad;
    return { x: i * Math.cos(e), y: i * Math.sin(e) };
}

function position(t, e, i) {
    return {
        x: t * canvas.width + (canvas.width / 2 - mouse.x + (nPos.x - 0.5) * noiseStrength) * i * motion,
        y: e * canvas.height + (canvas.height / 2 - mouse.y + (nPos.y - 0.5) * noiseStrength) * i * motion
    };
}

function sizeRatio() { return canvas.width >= canvas.height ? canvas.width : canvas.height; }
function random(t, e, i) { return i ? Math.random() * (e - t) + t : Math.floor(Math.random() * (e - t + 1)) + t; }

Link.prototype.render = function() {
    var t, e, i, s;
    switch (this.stage) {
        case 0:
            var o = particles[this.verts[this.verts.length - 1]];
            if (o && o.neighbors && o.neighbors.length > 0) {
                var a = o.neighbors[random(0, o.neighbors.length - 1)];
                if (-1 == this.verts.indexOf(a)) this.verts.push(a);
            } else { this.stage = 3; this.finished = true; }
            if (this.verts.length >= this.length) {
                for (t = 0; t < this.verts.length - 1; t++) {
                    var l = particles[this.verts[t]], h = particles[this.verts[t + 1]], $ = l.x - h.x, f = l.y - h.y, d = Math.sqrt($ * $ + f * f);
                    this.distances.push(d);
                }
                this.stage = 1;
            }
            break;
        case 1:
            if (this.distances.length > 0) {
                for (t = 0, s = []; t < this.linked.length; t++) i = position((e = particles[this.linked[t]]).x, e.y, e.z), s.push([i.x, i.y]);
                var u = 1e-5 * linkSpeed * canvas.width;
                this.traveled += u;
                var v = this.distances[this.linked.length - 1];
                if (this.traveled >= v) {
                    this.traveled = 0;
                    this.linked.push(this.verts[this.linked.length]);
                    i = position((e = particles[this.linked[this.linked.length - 1]]).x, e.y, e.z);
                    s.push([i.x, i.y]);
                    if (this.linked.length >= this.verts.length) this.stage = 2;
                } else {
                    var p, g = particles[this.linked[this.linked.length - 1]], _ = particles[this.verts[this.linked.length]], x = v - this.traveled, k = (this.traveled * _.x + x * g.x) / v;
                    i = position(k, (this.traveled * _.y + x * g.y) / v, (this.traveled * _.z + x * g.z) / v);
                    s.push([i.x, i.y]);
                }
                this.drawLine(s);
            } else { this.stage = 3; this.finished = true; }
            break;
        case 2:
            if (this.verts.length > 1) {
                if (this.fade < linkFade) {
                    this.fade++;
                    s = [];
                    var y = (1 - this.fade / linkFade) * linkOpacity;
                    for (t = 0; t < this.verts.length; t++) i = position((e = particles[this.verts[t]]).x, e.y, e.z), s.push([i.x, i.y]);
                    this.drawLine(s, y);
                } else { this.stage = 3; this.finished = true; }
            } else { this.stage = 3; this.finished = true; }
            break;
        default: this.finished = true;
    }
};

Link.prototype.drawLine = function(t, e) {
    if ("number" != typeof e && (e = linkOpacity), t.length > 1 && e > 0) {
        context.globalAlpha = e;
        context.beginPath();
        for (var i = 0; i < t.length - 1; i++) context.moveTo(t[i][0], t[i][1]), context.lineTo(t[i + 1][0], t[i + 1][1]);
        context.strokeStyle = "#aaa"; // lighter gray for dark mode
        context.lineWidth = lineWidth;
        context.stroke();
        context.closePath();
        context.globalAlpha = 1;
    }
};

if (canvas) init();
