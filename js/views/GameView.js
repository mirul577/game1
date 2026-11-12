export class GameView {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
  }

  render(vm) {
    const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const camera = vm.camera;
    c.clearRect(0, 0, W, H);
    c.save();
    c.translate(-camera.x, -camera.y);

    // Large continuous world, rendered only around the camera viewport.
    const left = Math.floor(camera.x / 96) * 96;
    const top = Math.floor(camera.y / 96) * 96;
    for (let y = top; y < camera.y + H + 96; y += 96) {
      for (let x = left; x < camera.x + W + 96; x += 96) {
        const biome = vm.getBiome(x + 48, y + 48);
        const palette = {
          forest: ["#315d43", "#37694a"], desert: ["#b99558", "#c6a365"],
          snow: ["#b9d2d9", "#c8e0e5"], highlands: ["#596b50", "#647b59"],
          swamp: ["#405b43", "#4a6548"]
        }[biome];
        const seed = Math.abs(Math.floor(x / 96 * 13 + y / 96 * 7)) % 2;
        c.fillStyle = palette[seed]; c.fillRect(x, y, 95, 95);
        c.fillStyle = "#ffffff0b"; c.fillRect(x + 3, y + 3, 88, 2);
        c.fillStyle = "#061a1630"; c.fillRect(x, y + 92, 95, 3);
        // Biome ground details.
        if (biome === "desert") {
          c.fillStyle = "#e8cd8a55"; c.beginPath(); c.ellipse(x + 32, y + 55, 17, 5, -.3, 0, Math.PI*2); c.fill();
        } else if (biome === "snow") {
          c.fillStyle = "#ffffff55"; c.beginPath(); c.arc(x + 24, y + 28, 3, 0, Math.PI*2); c.fill();
        } else if (biome === "swamp") {
          c.fillStyle = "#1b382c66"; c.beginPath(); c.ellipse(x + 58, y + 56, 22, 9, .2, 0, Math.PI*2); c.fill();
        } else {
          c.fillStyle = "#a8ca7755"; c.fillRect(x + 18, y + 35, 3, 7);
        }
      }
    }

    // A river crossing and winding trail act as exploration landmarks.
    c.fillStyle = "#183e4d"; c.beginPath(); c.moveTo(0, 1720);
    c.bezierCurveTo(1200, 1550, 1700, 2050, 2900, 1900);
    c.bezierCurveTo(3900, 1760, 4700, 2050, 6000, 1840);
    c.lineTo(6000, 1925); c.bezierCurveTo(4700, 2135, 3900, 1850, 2900, 1985);
    c.bezierCurveTo(1700, 2135, 1200, 1640, 0, 1805); c.closePath(); c.fill();
    c.strokeStyle = "#75c8d0"; c.lineWidth = 3; c.stroke();
    c.strokeStyle = "#b49a6b"; c.lineWidth = 24; c.setLineDash([18, 18]);
    c.beginPath(); c.moveTo(3000, 3000); c.bezierCurveTo(3300, 2600, 2600, 2200, 3150, 1600); c.stroke(); c.setLineDash([]);

    // World landmarks are placed in world coordinates, not screen coordinates.
    this.drawBuilding(2860, 2860, 115, 72, "#a65f3d");
    this.drawBuilding(3070, 2860, 130, 72, "#94704a");
    c.fillStyle = "#f1d9a8"; c.font = "bold 13px system-ui"; c.textAlign = "center";
    c.fillText("STARTING VILLAGE", 3010, 2825);

    // Scenery props repeat deterministically across the world.
    for (let gx = Math.floor(left / 260) * 260; gx < camera.x + W + 260; gx += 260) {
      for (let gy = Math.floor(top / 260) * 260; gy < camera.y + H + 260; gy += 260) {
        const seed = Math.abs(Math.floor(gx * 17 + gy * 31)) % 100;
        const biome = vm.getBiome(gx + 100, gy + 100);
        if (seed < 38 && biome !== "desert") this.drawTree(gx + 90 + seed, gy + 100 + (seed % 50));
        else if (seed < 53) {
          c.fillStyle = biome === "desert" ? "#a28a65" : "#68777a";
          c.beginPath(); c.ellipse(gx + 125, gy + 145, 17, 11, .2, 0, Math.PI*2); c.fill();
          c.fillStyle = "#ffffff35"; c.fillRect(gx + 116, gy + 137, 8, 2);
        }
      }
    }

    // Gatherable resources and player-built shelters.
    for (const resource of vm.resources) if (!resource.collected) this.drawResource(resource);
    for (const structure of vm.structures) this.drawCamp(structure);
    if (vm.kingdom) this.drawKingdomKeep(vm.kingdom);
    this.drawKingdomKeep(vm.rivalKingdom, true);
    for (const m of vm.quests.getMapMarkers()) {
      if (m.x < camera.x - 80 || m.x > camera.x + W + 80 || m.y < camera.y - 40 || m.y > camera.y + H + 190) continue;
      this.drawQuestBeacon(m);
    }

    const entities = [
      ...vm.npcs.map(n => ({ type: "npc", value: n })),
      ...vm.botNPCs.map(n => ({ type: "npc", value: n })),
      ...(vm.kingdom?.guards || []).map(n => ({ type: "npc", value: n })),
      ...vm.war.enemyUnits.map(n => ({ type: "monster", value: n })),
      ...vm.monsters.map(m => ({ type: "monster", value: m })),
      { type: "player", value: vm.player }
    ].sort((a, b) => a.value.y - b.value.y);
    for (const entity of entities) {
      if (entity.type === "npc") this.drawCharacter(entity.value, false, vm.quests.markerFor(entity.value));
      else if (entity.type === "monster") this.drawMonster(entity.value);
      else this.drawCharacter(entity.value, true);
    }
    for (const particle of vm.particles) {
      c.globalAlpha = particle.life / 45; c.fillStyle = particle.color;
      c.font = "bold 15px system-ui"; c.textAlign = "center";
      c.fillText(particle.text, particle.x, particle.y); c.globalAlpha = 1;
    }
    c.restore();

    // Fixed screen-space quest arrow and zone readout.
    this.drawQuestGuide(vm);
    const zone = vm.zoneAt(vm.player.x, vm.player.y);
    c.fillStyle = "#081522bb"; c.fillRect(10, 10, 280, 58);
    c.fillStyle = zone.color; c.fillRect(10, 10, 4, 58);
    c.textAlign = "left"; c.font = "bold 12px system-ui"; c.fillStyle = "#fff";
    c.fillText(zone.name.toUpperCase(), 22, 28);
    c.fillStyle = zone.color;
    c.fillText(`${zone.risk} · Tier ${zone.tier} · ${Math.round(zone.rewardMult * 100)}% rewards`, 22, 44);
    c.font = "11px system-ui"; c.fillStyle = "#cbd5e1";
    c.fillText(`X: ${Math.floor(vm.player.x)}  Y: ${Math.floor(vm.player.y)}  |  WORLD 6000 × 6000`, 22, 60);
  }

  drawQuestBeacon(m) {
    const c = this.ctx, t = performance.now() / 500, pulse = 0.5 + 0.5 * Math.sin(t + m.x);
    const g = c.createLinearGradient(0, m.y - 130, 0, m.y);
    g.addColorStop(0, "#0000"); g.addColorStop(1, m.color + "aa");
    c.fillStyle = g; c.fillRect(m.x - 5, m.y - 130, 10, 130);
    c.globalAlpha = 0.35 + 0.35 * pulse; c.fillStyle = m.color;
    c.beginPath(); c.ellipse(m.x, m.y, 26 + pulse * 6, 10, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    const y = m.y - 140 + Math.sin(t * 2) * 4;
    c.fillStyle = m.color; c.strokeStyle = "#000a"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(m.x, y - 12); c.lineTo(m.x + 10, y); c.lineTo(m.x, y + 12); c.lineTo(m.x - 10, y); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#fff"; c.font = "bold 11px system-ui"; c.textAlign = "center";
    c.shadowColor = "#000"; c.shadowBlur = 4; c.fillText(m.label, m.x, y - 18); c.shadowBlur = 0;
  }

  // Edge-of-screen arrow pointing at the nearest tracked quest objective.
  drawQuestGuide(vm) {
    const target = vm.quests.getGuide(vm.player.x, vm.player.y);
    if (!target) return;
    const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const sx = target.x - vm.camera.x, sy = target.y - vm.camera.y;
    if (sx > 40 && sx < W - 40 && sy > 40 && sy < H - 40) return;
    const angle = Math.atan2(sy - H / 2, sx - W / 2);
    const k = Math.min((W / 2 - 44) / Math.max(0.001, Math.abs(Math.cos(angle))), (H / 2 - 44) / Math.max(0.001, Math.abs(Math.sin(angle))));
    const ex = W / 2 + Math.cos(angle) * k, ey = H / 2 + Math.sin(angle) * k;
    c.save(); c.translate(ex, ey); c.rotate(angle);
    c.fillStyle = target.color; c.strokeStyle = "#000c"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, -11); c.lineTo(-4, 0); c.lineTo(-10, 11); c.closePath(); c.stroke(); c.fill();
    c.restore();
    c.fillStyle = "#fff"; c.font = "bold 11px system-ui"; c.textAlign = "center";
    c.shadowColor = "#000"; c.shadowBlur = 4;
    c.fillText(`${Math.round(Math.hypot(target.x - vm.player.x, target.y - vm.player.y) / 10)} m`, ex, ey + (sy > H / 2 ? -18 : 28));
    c.shadowBlur = 0;
  }

  drawResource(resource) {
    const c = this.ctx, x = resource.x, y = resource.y;
    c.fillStyle = "#0005"; c.beginPath(); c.ellipse(x, y + 10, 16, 6, 0, 0, Math.PI*2); c.fill();
    if (resource.type === "tree") {
      c.fillStyle = "#65432f"; c.fillRect(x - 5, y - 4, 10, 22);
      c.fillStyle = "#17633f"; c.beginPath(); c.arc(x, y - 13, 17, 0, Math.PI*2); c.fill();
      c.fillStyle = "#39a45f"; c.beginPath(); c.arc(x - 5, y - 19, 9, 0, Math.PI*2); c.fill();
    } else if (resource.type === "rock") {
      c.fillStyle = "#75858b"; c.beginPath(); c.moveTo(x-15,y+5); c.lineTo(x-9,y-12); c.lineTo(x+5,y-17); c.lineTo(x+16,y-3); c.lineTo(x+12,y+7); c.closePath(); c.fill();
      c.fillStyle = "#d3e0e3"; c.fillRect(x-6,y-10,7,3);
    } else {
      c.fillStyle = "#2d8a4e"; c.fillRect(x-3,y-12,6,20);
      c.fillStyle = "#e84b68"; for (const dx of [-7,5]) { c.beginPath(); c.arc(x+dx,y-7,4,0,Math.PI*2); c.fill(); }
    }
  }

  drawCamp(item) {
    const c = this.ctx, x = item.x, y = item.y;
    c.fillStyle = "#0006"; c.beginPath(); c.ellipse(x+5,y+18,35,12,0,0,Math.PI*2); c.fill();
    c.fillStyle = "#765033"; c.beginPath(); c.moveTo(x-30,y+15); c.lineTo(x,y-25); c.lineTo(x+31,y+15); c.closePath(); c.fill();
    c.fillStyle = "#b88953"; c.beginPath(); c.moveTo(x,y-25); c.lineTo(x+31,y+15); c.lineTo(x+5,y+15); c.closePath(); c.fill();
    c.fillStyle = "#f8b84e"; c.beginPath(); c.arc(x,y+9,7,0,Math.PI*2); c.fill();
  }

  drawKingdomKeep(kingdom, enemy = false) {
    const c = this.ctx, x = kingdom.x, y = kingdom.y;
    c.fillStyle = "#0007"; c.beginPath(); c.ellipse(x + 8, y + 22, 65, 20, 0, 0, Math.PI*2); c.fill();
    c.fillStyle = enemy ? "#653b43" : "#65758a"; c.fillRect(x - 48, y - 25, 96, 55);
    c.fillStyle = enemy ? "#a14e55" : "#91a6ba";
    c.fillRect(x - 42, y - 32, 18, 65); c.fillRect(x + 24, y - 32, 18, 65);
    c.fillStyle = enemy ? "#452c38" : "#35485e";
    c.beginPath(); c.moveTo(x - 49, y - 31); c.lineTo(x - 33, y - 54); c.lineTo(x - 17, y - 31); c.fill();
    c.beginPath(); c.moveTo(x + 17, y - 31); c.lineTo(x + 33, y - 54); c.lineTo(x + 49, y - 31); c.fill();
    c.fillStyle = enemy ? "#e58a76" : "#ffd166"; c.fillRect(x - 3, y - 10, 6, 40);
    c.fillStyle = "#fff"; c.font = "bold 12px system-ui"; c.textAlign = "center";
    c.fillText(kingdom.name, x, y - 64);
    if (!enemy && kingdom.isPlayer) {
      c.fillStyle = "#101827"; c.fillRect(x - 45, y + 39, 90, 6);
      c.fillStyle = "#5eead4"; c.fillRect(x - 45, y + 39, 90 * kingdom.fortHp / kingdom.maxFortHp, 6);
    }
  }

  drawBuilding(x, y, w, h, color) {
    const c = this.ctx, depth = 17;
    c.fillStyle = "#392b2a"; c.fillRect(x + 8, y + h, w, depth);
    c.fillStyle = this.shade(color, -35); c.fillRect(x + w, y + 8, depth, h);
    c.fillStyle = color; c.fillRect(x, y, w, h);
    c.fillStyle = this.shade(color, 25); c.fillRect(x, y, w, 9);
    c.fillStyle = "#4b302d";
    c.beginPath(); c.moveTo(x - 12, y + 9); c.lineTo(x + w / 2, y - 25); c.lineTo(x + w + 12, y + 9); c.closePath(); c.fill();
    c.fillStyle = "#805044";
    c.beginPath(); c.moveTo(x + w / 2, y - 25); c.lineTo(x + w + 12, y + 9); c.lineTo(x + w / 2, y + 9); c.closePath(); c.fill();
    c.fillStyle = "#f2d5a0"; c.fillRect(x + w * .25, y + 30, 20, 24);
    c.fillStyle = "#543a30"; c.fillRect(x + w * .62, y + 35, 22, h - 35);
    c.fillStyle = "#ffffff30"; c.fillRect(x + 5, y + 12, 4, h - 20);
  }

  drawTree(x, y) {
    const c = this.ctx;
    c.fillStyle = "#0005"; c.beginPath(); c.ellipse(x + 5, y + 18, 22, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#65432f"; c.fillRect(x - 7, y - 2, 14, 34);
    c.fillStyle = "#3b281f"; c.fillRect(x + 4, y, 4, 30);
    for (const layer of [{r:19,dx:0,dy:-15,col:"#155b3e"},{r:16,dx:-9,dy:-23,col:"#20744a"},{r:15,dx:8,dy:-27,col:"#2d8752"},{r:11,dx:0,dy:-37,col:"#3b995c"}]) {
      c.fillStyle = layer.col; c.beginPath(); c.arc(x + layer.dx, y + layer.dy, layer.r, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = "#ffffff22"; c.beginPath(); c.arc(x - 5, y - 33, 6, 0, Math.PI * 2); c.fill();
  }

  drawMonster(m) {
    const c = this.ctx;
    c.fillStyle = "#0007"; c.beginPath(); c.ellipse(m.x + 3, m.y + 13, 20, 9, 0, 0, Math.PI * 2); c.fill();
    const body = c.createRadialGradient(m.x - 7, m.y - 10, 2, m.x, m.y, 22);
    body.addColorStop(0, "#e2ffd0"); body.addColorStop(.35, m.color); body.addColorStop(1, this.shade(m.color, -55));
    c.fillStyle = body; c.beginPath(); c.ellipse(m.x, m.y, 18, 16, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffffff55"; c.beginPath(); c.ellipse(m.x - 6, m.y - 8, 6, 3, -.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#18252b"; c.beginPath(); c.arc(m.x - 6, m.y - 2, 2.5, 0, Math.PI * 2); c.arc(m.x + 6, m.y - 2, 2.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#241d2a"; c.fillRect(m.x - 18, m.y - 27, 36, 5);
    c.fillStyle = "#fb7185"; c.fillRect(m.x - 18, m.y - 27, 36 * Math.max(0, m.hp / m.maxHp), 5);
    c.fillStyle = "#fff"; c.font = "10px system-ui"; c.textAlign = "center"; c.fillText(m.kind || m.name || "Raider", m.x, m.y - 32);
  }

  drawCharacter(person, isPlayer = false, marker = null) {
    const c = this.ctx, x = person.x, y = person.y;
    c.fillStyle = "#0007"; c.beginPath(); c.ellipse(x + 2, y + 15, 16, 7, 0, 0, Math.PI * 2); c.fill();
    // Boots and legs.
    c.fillStyle = "#292c3c"; c.fillRect(x - 10, y + 4, 8, 12); c.fillRect(x + 3, y + 4, 8, 12);
    c.fillStyle = "#57483d"; c.fillRect(x - 12, y + 12, 10, 5); c.fillRect(x + 2, y + 12, 10, 5);
    // Torso with shaded sides.
    c.fillStyle = this.shade(person.color, -45); c.beginPath(); c.moveTo(x - 12, y - 7); c.lineTo(x + 12, y - 7); c.lineTo(x + 10, y + 8); c.lineTo(x - 10, y + 8); c.closePath(); c.fill();
    c.fillStyle = person.color; c.fillRect(x - 9, y - 8, 17, 14);
    c.fillStyle = "#ffffff55"; c.fillRect(x - 7, y - 7, 4, 11);
    // Head, hair and face.
    c.fillStyle = "#f2c69d"; c.beginPath(); c.arc(x, y - 14, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = isPlayer ? "#4b3026" : "#342c48"; c.beginPath(); c.arc(x, y - 18, 8, Math.PI, Math.PI * 2); c.fill();
    c.fillStyle = "#17202b"; c.fillRect(x - 4, y - 15, 2, 2); c.fillRect(x + 3, y - 15, 2, 2);
    if (isPlayer) {
      // Visible weapon gives the player a stronger RPG silhouette.
      c.strokeStyle = "#dbeafe"; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 9, y - 4); c.lineTo(x + 19, y - 19); c.stroke();
      c.strokeStyle = "#b8874b"; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 6, y + 1); c.lineTo(x + 11, y - 6); c.stroke();
    }
    c.fillStyle = "#fff"; c.font = "bold 11px system-ui"; c.textAlign = "center";
    c.shadowColor = "#000"; c.shadowBlur = 4; c.fillText(person.name, x, y - 30); c.shadowBlur = 0;
    if (marker) {
      const bob = Math.sin(performance.now() / 260) * 3;
      c.font = "bold 24px system-ui"; c.lineWidth = 4; c.strokeStyle = "#000";
      c.strokeText(marker.symbol, x, y - 46 + bob); c.fillStyle = marker.color; c.fillText(marker.symbol, x, y - 46 + bob);
    }
  }

  shade(hex, amount) {
    const raw = hex.replace("#", "");
    const n = parseInt(raw, 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (n & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }


  drawWorldMap(vm) {
    const canvas = document.getElementById("worldMapCanvas");
    if (!canvas || !vm.player) return;
    const c = canvas.getContext("2d"), size = canvas.width, scale = size / vm.worldSize;
    const regions = [
      { x: 0, y: 0, w: .22, h: 1, color: "#b99558" },
      { x: .22, y: 0, w: .56, h: .22, color: "#647b59" },
      { x: .22, y: .22, w: .56, h: .56, color: "#37694a" },
      { x: .78, y: 0, w: .22, h: 1, color: "#c8e0e5" },
      { x: .22, y: .78, w: .56, h: .22, color: "#4a6548" }
    ];
    c.clearRect(0, 0, size, size);
    c.fillStyle = "#203b35"; c.fillRect(0, 0, size, size);
    for (const r of regions) {
      c.fillStyle = r.color; c.fillRect(r.x * size, r.y * size, r.w * size, r.h * size);
    }
    // Region borders and labels.
    c.strokeStyle = "#ffffff35"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(size*.22,0); c.lineTo(size*.22,size); c.moveTo(size*.78,0); c.lineTo(size*.78,size);
    c.moveTo(size*.22,size*.22); c.lineTo(size*.78,size*.22); c.moveTo(size*.22,size*.78); c.lineTo(size*.78,size); c.stroke();
    c.fillStyle = "#14223899"; c.font = "bold 14px system-ui"; c.textAlign = "center";
    c.fillText("DESERT", size*.11, size*.5);
    c.fillText("HIGHLANDS", size*.5, size*.1);
    c.fillText("FOREST", size*.5, size*.5);
    c.fillText("SNOW", size*.89, size*.5);
    c.fillText("SWAMP", size*.5, size*.9);
    // River path, village and points of interest.
    c.strokeStyle = "#287d9b"; c.lineWidth = 9; c.beginPath();
    c.moveTo(0,1720*scale); c.bezierCurveTo(1200*scale,1550*scale,1700*scale,2050*scale,2900*scale,1900*scale);
    c.bezierCurveTo(3900*scale,1760*scale,4700*scale,2050*scale,6000*scale,1840*scale); c.stroke();
    const dot = (x,y,color,r,label) => {
      c.fillStyle = "#101827aa"; c.beginPath(); c.arc(x*scale,y*scale,r+2,0,Math.PI*2); c.fill();
      c.fillStyle = color; c.beginPath(); c.arc(x*scale,y*scale,r,0,Math.PI*2); c.fill();
      if (label) { c.fillStyle="#101827"; c.font="bold 11px system-ui"; c.textAlign="left"; c.fillText(label,x*scale+r+4,y*scale+4); }
    };
    for (const m of vm.quests.getMapMarkers()) {
      const x = m.x * scale, y = m.y * scale, r = m.active ? 9 : 7;
      c.fillStyle = "#101827"; c.beginPath(); c.moveTo(x, y - r - 2); c.lineTo(x + r + 2, y); c.lineTo(x, y + r + 2); c.lineTo(x - r - 2, y); c.closePath(); c.fill();
      c.fillStyle = m.color; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); c.fill();
      c.fillStyle = "#101827"; c.font = "bold 10px system-ui"; c.textAlign = "left"; c.fillText(m.label, x + r + 4, y + 3);
    }
    dot(3000,3000,"#22c55e",7,"Starting Village");
    dot(vm.rivalKingdom.x,vm.rivalKingdom.y,"#ef4444",7,"Ironfang");
    if (vm.kingdom) dot(vm.kingdom.x,vm.kingdom.y,"#facc15",7,vm.kingdom.name);
    for (const enemy of vm.war.enemyUnits) dot(enemy.x,enemy.y,"#7f1d1d",3);
    for (const npc of vm.botNPCs) dot(npc.x,npc.y,"#bbf7d0",2);
    dot(vm.player.x,vm.player.y,"#2563eb",7,"YOU");
    // Viewport rectangle indicates the current camera window.
    c.strokeStyle="#ffffff";c.lineWidth=2;
    c.strokeRect(vm.camera.x*scale,vm.camera.y*scale,canvas.width*scale*0.0 + this.canvas.width*scale,this.canvas.height*scale);
  }

  updateHUD(player, inventory = { wood: 0, stone: 0, berries: 0 }, biome = "forest", survival = { hunger: 100, thirst: 100 }, kingdom = null, war = { message: "No war declared" }) {
    const set = (id, value) => { document.getElementById(id).textContent = value; };
    set("gold", player.gold); set("level", player.level); set("weapon", player.weapon);
    set("playerName", player.name); set("className", player.characterClass);
    set("hpText", `${player.hp}/${player.maxHp}`);
    document.getElementById("hpBar").style.width = `${player.hp/player.maxHp*100}%`;
    set("mpText", `${player.mp}/${player.maxMp}`);
    document.getElementById("mpBar").style.width = `${player.mp/player.maxMp*100}%`;
    set("xpText", `${player.exp}/${player.expRequired}`);
    document.getElementById("xpBar").style.width = `${player.exp/player.expRequired*100}%`;
    set("potionButton", `🧪 Use Potion (${player.potions})`);
    set("woodCount", inventory.wood); set("stoneCount", inventory.stone); set("berryCount", inventory.berries);
    set("biomeName", biome.toUpperCase());
    set("hungerText", `${survival.hunger}%`); set("thirstText", `${survival.thirst}%`);
    document.getElementById("hungerBar").style.width = `${survival.hunger}%`;
    document.getElementById("thirstBar").style.width = `${survival.thirst}%`;
    set("kingdomName", kingdom ? kingdom.name : "No kingdom founded");
    set("kingdomGuards", kingdom ? kingdom.guards.length : 0);
    set("fortHpText", kingdom ? `${kingdom.fortHp}/${kingdom.maxFortHp}` : "—");
    set("warStatus", war.message);
  }

  // ---------- Quest UI ----------
  el(tag, className = "", text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  timerSpan(q) {
    const wrap = this.el("span", "quest-timer", "⏱ ");
    const value = this.el("span", "", q.timeLeft);
    value.dataset.timer = q.id;
    wrap.append(value);
    return wrap;
  }

  updateTimers(timers) {
    for (const [id, text] of Object.entries(timers)) {
      document.querySelectorAll(`[data-timer="${id}"]`).forEach(node => { node.textContent = text; });
    }
  }

  renderTracker(list) {
    const box = document.getElementById("questTracker");
    if (!box) return;
    box.replaceChildren();
    if (!list.length) {
      box.append(this.el("p", "muted", "No active quests. Look for ❗ above NPCs, or open the Journal's World tab."));
      return;
    }
    for (const q of list) {
      const item = this.el("div", `track-item${q.ready ? " ready" : ""}`);
      item.style.setProperty("--qc", q.color);
      const title = this.el("div", "track-title", `${q.icon} ${q.title}`);
      if (q.timeLeft) { title.append(" "); title.append(this.timerSpan(q)); }
      item.append(title);
      if (q.ready) item.append(this.el("small", "track-ready", `✔ Return to ${q.turnIn}`));
      else for (const o of q.objectives) item.append(this.el("small", o.done ? "done" : "", `${o.done ? "✔" : "•"} ${o.label} ${o.progress}/${o.amount}`));
      box.append(item);
    }
  }

  questCard(q) {
    const card = this.el("div", `quest-card ${q.status}`);
    card.style.setProperty("--qc", q.color);
    const head = this.el("div", "quest-head");
    head.append(this.el("span", "quest-badge", `${q.icon} ${q.typeLabel}`), this.el("b", "quest-title", q.title));
    if (q.timeLeft) head.append(this.timerSpan(q));
    card.append(head);
    if (q.zoneName) { const zone = this.el("div", "quest-zone", q.zoneName); zone.style.color = q.zoneColor; card.append(zone); }
    if (q.description) card.append(this.el("p", "quest-desc", q.description));
    const list = this.el("ul", "quest-objectives");
    for (const o of q.objectives) {
      const li = this.el("li", o.done ? "done" : "");
      li.append(this.el("span", "", `${o.done ? "✔" : "○"} ${o.label}`), this.el("b", "", `${o.progress}/${o.amount}`));
      list.append(li);
    }
    card.append(list);
    if (q.rewards) card.append(this.el("div", "quest-rewards", `Rewards: ${q.rewards}`));
    if (q.statusText) card.append(this.el("div", "quest-status", q.statusText));
    return card;
  }

  renderJournal(list, tab, handlers = {}) {
    const empty = {
      active: "Your quest log is empty. Talk to NPCs marked ❗ or step into a World Quest zone.",
      main: "No main quests available right now.", side: "No side quests available right now.",
      npc: "No villager errands right now. Check back after the cooldown.",
      world: "No world quests posted yet.", class: "No character quests available yet. Visit your class trainer.",
      done: "Nothing completed yet."
    };
    document.querySelectorAll("#journalTabs [data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    const body = document.getElementById("journalBody");
    body.replaceChildren();
    if (!list.length) { body.append(this.el("p", "muted", empty[tab] || "")); return; }
    for (const q of list) {
      const card = this.questCard(q);
      if (q.canAbandon) {
        const button = this.el("button", "quest-btn ghost", "Abandon");
        button.addEventListener("click", () => handlers.onAbandon?.(q.id));
        card.append(button);
      }
      body.append(card);
    }
  }

  showDialogue({ name, role, text, entries }) {
    document.getElementById("dlgName").textContent = name;
    document.getElementById("dlgRole").textContent = role;
    document.getElementById("dlgText").textContent = text;
    const list = document.getElementById("dlgChoices");
    list.replaceChildren();
    for (const q of entries) {
      const card = this.questCard(q);
      if (q.action) {
        const button = this.el("button", `quest-btn${q.action === "Complete" ? " complete" : ""}`, q.action === "Complete" ? "✔ Complete Quest" : "Accept Quest");
        button.addEventListener("click", q.run);
        card.append(button);
      }
      list.append(card);
    }
    document.getElementById("dialogueBox").classList.remove("hidden");
  }

  hideDialogue() { document.getElementById("dialogueBox")?.classList.add("hidden"); }

  log(message) {
    const log = document.getElementById("gameLog");
    const line = document.createElement("div"); line.textContent = message;
    log.prepend(line); while (log.children.length > 35) log.lastChild.remove();
  }
  toast(message) {
    const el = document.getElementById("toast"); el.textContent = message; el.style.display = "block";
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => el.style.display = "none", 1800);
  }

}