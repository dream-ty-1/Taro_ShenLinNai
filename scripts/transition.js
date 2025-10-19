(function(){
  const TIMINGS = {
    darken: 600,
    deckInDelay: 200,
    deckIn: 900,
    textIn: 700,
    textHold: 400,
    textOut: 600,
    fan: 1100,
    fanHold: 450,
    disperse: 900,
    overlayFade: 700,
  };

  function createEl(tag, className){
    const el = document.createElement(tag);
    if(className) el.className = className;
    return el;
  }

  function createOverlay(enableStars){
    const overlay = createEl('div','transition-overlay');
    const bg = createEl('div','transition-bg');
    overlay.appendChild(bg);
    if(enableStars){
      const stars = createEl('div','transition-stars');
      // Simple SVG star layer
      const short = Math.min(window.innerWidth, window.innerHeight);
      const count = short < 520 ? 80 : short < 768 ? 110 : 140;
      stars.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${Array.from({length: count}).map(()=>{
        const x = Math.random()*100, y = Math.random()*100, r = Math.random()*0.8+0.1;
        return `<circle cx="${x}%" cy="${y}%" r="${r}" fill="white" />`;
      }).join('')}</svg>`;
      overlay.appendChild(stars);
    }
    document.body.appendChild(overlay);
    return overlay;
  }

  function createDeck(overlay, cardCount){
    const mount = createEl('div','transition-deck-mount');
    const deck = createEl('div','transition-deck');
    mount.appendChild(deck);
    overlay.appendChild(mount);

    const cards = [];
    for(let i=0;i<cardCount;i++){
      const card = createEl('div','transition-card');
      const border = createEl('div','transition-card-border');
      const core = createEl('div','transition-card-core');
      const emblem = createEl('div','transition-card-emblem');
      core.appendChild(emblem); border.appendChild(core); card.appendChild(border);
      deck.appendChild(card);
      // initial state
      card.style.opacity = '0';
      card.style.transform = 'translate(-50%, -50%) scale(0.98)';
      card.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
      cards.push(card);
    }
    return { mount, deck, cards };
  }

  function createBottomText(overlay, text){
    const el = createEl('div','transition-bottom-text');
    el.textContent = text || '';
    el.style.opacity = '0';
    overlay.appendChild(el);
    return el;
  }

  function computeAngles(cardCount){
    const step = 360 / cardCount;
    return Array.from({length: cardCount}, (_,i)=> i*step);
  }

  function playStages({ cardCount, text, pointing, radialAlign, enableStars, holdAtBlack }){
    return new Promise((resolve)=>{
      const overlay = createOverlay(!!enableStars);
      const { cards } = createDeck(overlay, cardCount);
      const bottomText = createBottomText(overlay, text || '');
      const angles = computeAngles(cardCount);
      const radiusVmin = (()=>{
        const short = Math.min(window.innerWidth, window.innerHeight);
        if(short < 560) return 22; if(short < 768) return 26; if(short > 1200) return 32; return 28;
      })();

      const timers = [];
      const after = (ms, fn)=> timers.push(setTimeout(fn, ms));
      let t = 0; const step = (ms, fn)=>{ t+=ms; after(t, fn); };

      // Stage 1: darken already visible via overlay
      // Stage 2: deckIn
      step(TIMINGS.darken + TIMINGS.deckInDelay, ()=>{
        cards.forEach((c,i)=>{
          c.style.transition = `transform ${TIMINGS.deckIn}ms ease, opacity ${TIMINGS.deckIn}ms ease`;
          c.style.opacity = '1';
          c.style.transform = 'translate(-50%, -50%) scale(1)';
        });
      });

      // Stage 3: textIn
      step(TIMINGS.deckIn, ()=>{
        bottomText.style.transition = `opacity ${TIMINGS.textIn}ms ease, transform ${TIMINGS.textIn}ms ease`;
        bottomText.style.transform = 'translateY(0px)';
        bottomText.style.opacity = '1';
      });

      // Stage 4: textOut
      step(TIMINGS.textIn + TIMINGS.textHold, ()=>{
        bottomText.style.transition = `opacity ${TIMINGS.textOut}ms ease, transform ${TIMINGS.textOut}ms ease`;
        bottomText.style.transform = 'translateY(10px)';
        bottomText.style.opacity = '0';
      });

      // Stage 5: fan
      step(TIMINGS.textOut, ()=>{
        cards.forEach((c, i)=>{
          const angle = angles[i];
          const beta = radialAlign ? (pointing === 'outward' ? -90 : 90) : -angle;
          c.style.transition = `transform ${TIMINGS.fan}ms ease, opacity ${TIMINGS.fan}ms ease, filter ${TIMINGS.fan}ms ease`;
          c.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translate(${radiusVmin}vmin) rotate(${beta}deg)`;
          c.style.filter = 'drop-shadow(0 12px 16px rgba(0,0,0,0.45))';
        });
      });

      // Stage 6: disperse
      step(TIMINGS.fan + TIMINGS.fanHold, ()=>{
        cards.forEach((c, i)=>{
          const angle = angles[i];
          const beta = radialAlign ? (pointing === 'outward' ? -90 : 90) : -angle;
          c.style.transition = `transform ${TIMINGS.disperse}ms ease, opacity ${TIMINGS.disperse}ms ease`;
          c.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translate(${radiusVmin*2}vmin) rotate(${beta}deg)`;
          c.style.opacity = '0';
        });
      });

      // Stage 7: overlay fade or hold black
      step(TIMINGS.disperse + TIMINGS.overlayFade, ()=>{
        if(holdAtBlack){
          // Keep overlay; resolve so navigation can proceed under black
          resolve();
        } else {
          overlay.style.transition = `opacity ${TIMINGS.overlayFade}ms ease`;
          overlay.style.opacity = '0';
          after(TIMINGS.overlayFade, ()=>{ overlay.remove(); resolve(); });
        }
      });

      // Cleanup if navigation happens quickly
      const cleanup = ()=> timers.forEach(id=>clearTimeout(id));
      window.addEventListener('pagehide', cleanup, { once:true });
    });
  }

  async function playFanTransition(options){
    const opts = Object.assign({ cardCount: 22, text: '- 命运 -', pointing: 'inward', radialAlign: true, enableStars: true, holdAtBlack: false }, options||{});
    return await playStages(opts);
  }

  window.playFanTransition = playFanTransition;
})();


