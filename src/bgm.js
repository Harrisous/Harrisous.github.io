/* SoundCloud playback is requested only by a user gesture. The widget must
 * announce READY before receiving transport commands. PLAY is the authority
 * for the UI's playing state, never the click or a successful script load. */
const { useEffect, useRef, useState } = React;
export const BGM_TRACK_URL = 'https://soundcloud.com/derekecycle/the-rebel-path';
const API_SRC = 'https://w.soundcloud.com/player/api.js';
const INITIAL_STATE = { playing: false, vol: 50, status: 'idle', error: '' };

export function createBgmController({ iframe, onChange, win = window, doc = document }) {
  let state = { ...INITIAL_STATE };
  let desiredPlaying = false;
  let widget = null;
  let ready = false;
  let disposed = false;
  let generation = 0;
  let initializing = false;
  let apiPromise = null;
  let cancelApiLoad = null;
  let readyTimer = null;
  let playbackTimer = null;
  const bindings = [];

  const publish = patch => {
    if (disposed) return;
    state = { ...state, ...patch };
    onChange(state);
  };
  const clearReadyTimer = () => { if (readyTimer !== null) win.clearTimeout(readyTimer); readyTimer = null; };
  const clearPlaybackTimer = () => { if (playbackTimer !== null) win.clearTimeout(playbackTimer); playbackTimer = null; };
  const detachWidget = () => {
    clearReadyTimer();
    clearPlaybackTimer();
    if (widget) {
      for (const event of bindings.splice(0)) widget.unbind(event);
      if (ready) widget.pause();
    }
    widget = null;
    ready = false;
    initializing = false;
  };
  const fail = message => {
    const wasRequested = desiredPlaying;
    desiredPlaying = false;
    generation++;
    detachWidget();
    publish({ playing: false, status: wasRequested ? 'error' : 'idle', error: wasRequested ? message : '' });
  };

  const loadApi = () => {
    if (win.SC?.Widget) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      let script = doc.querySelector('script[data-soundcloud-api="true"]');
      if (!script) {
        script = doc.createElement('script');
        script.src = API_SRC;
        script.async = true;
        script.dataset.soundcloudApi = 'true';
      }
      const cleanup = () => {
        script.removeEventListener('load', loaded);
        script.removeEventListener('error', failed);
        cancelApiLoad = null;
      };
      const loaded = () => {
        cleanup();
        if (win.SC?.Widget) resolve();
        else { script.remove(); apiPromise = null; reject(new Error('SoundCloud API unavailable')); }
      };
      const failed = () => {
        cleanup();
        script.remove();
        apiPromise = null;
        reject(new Error('SoundCloud API unavailable'));
      };
      cancelApiLoad = () => { cleanup(); script.remove(); apiPromise = null; };
      script.addEventListener('load', loaded, { once: true });
      script.addEventListener('error', failed, { once: true });
      if (!script.parentNode) doc.head.appendChild(script);
    });
    return apiPromise;
  };

  const playReadyWidget = () => {
    if (!ready || !widget || !desiredPlaying) return;
    clearPlaybackTimer();
    publish({ status: 'loading', error: '' });
    playbackTimer = win.setTimeout(() => {
      // Keep the ready player so another user click can call play directly,
      // without losing transient activation to another asynchronous load.
      playbackTimer = null;
      desiredPlaying = false;
      publish({ playing: false, status: 'error', error: 'Playback did not start. Retry or open the track on SoundCloud.' });
    }, 5000);
    widget.play();
  };
  const initialize = () => {
    if (initializing || disposed) return;
    if (!iframe || !iframe.dataset.src) { fail('Music player is unavailable. Open the track on SoundCloud.'); return; }
    initializing = true;
    const attempt = ++generation;
    publish({ status: 'loading', error: '' });
    readyTimer = win.setTimeout(() => {
      cancelApiLoad?.();
      fail('SoundCloud took too long to load. Retry or open the track directly.');
    }, 12000);
    loadApi().then(() => {
      if (disposed || attempt !== generation) return;
      // A hidden lazy iframe never enters the viewport. Loading stays opt-in,
      // but once requested the iframe must navigate immediately.
      iframe.setAttribute('loading', 'eager');
      iframe.setAttribute('src', iframe.dataset.src);
      widget = win.SC.Widget(iframe);
      const bind = (event, handler) => {
        bindings.push(event);
        widget.bind(event, (...args) => {
          if (!disposed && attempt === generation) handler(...args);
        });
      };
      const events = win.SC.Widget.Events;
      bind(events.READY, () => {
        ready = true;
        initializing = false;
        clearReadyTimer();
        widget.setVolume(state.vol);
        if (desiredPlaying) playReadyWidget();
        else publish({ status: 'paused', error: '' });
      });
      bind(events.PLAY, () => {
        if (!desiredPlaying) { widget.pause(); return; }
        clearPlaybackTimer();
        publish({ playing: true, status: 'playing', error: '' });
      });
      bind(events.PAUSE, () => {
        // A prior pause acknowledgement can arrive after a newer resume click.
        // Keep that latest intent while its PLAY confirmation is outstanding,
        // but reflect the actual paused state rather than displaying BGM ON.
        if (desiredPlaying && playbackTimer !== null) {
          publish({ playing: false, status: 'loading' });
          return;
        }
        // Initial buffering can also report PAUSE before READY/first PLAY.
        if (!state.playing && desiredPlaying) return;
        desiredPlaying = false;
        clearPlaybackTimer();
        publish({ playing: false, status: 'paused' });
      });
      bind(events.FINISH, () => {
        desiredPlaying = false;
        clearPlaybackTimer();
        publish({ playing: false, status: 'paused' });
      });
      bind(events.ERROR, () => fail('SoundCloud cannot play this track right now. Retry or open it directly.'));
    }).catch(() => {
      if (!disposed && attempt === generation) fail('SoundCloud could not load. Retry or open the track directly.');
    });
  };

  const toggle = () => {
    if (disposed) return;
    desiredPlaying = !desiredPlaying;
    if (!desiredPlaying) {
      clearPlaybackTimer();
      if (ready) widget.pause();
      if (!state.playing) publish({ status: ready ? 'paused' : 'idle', error: '' });
    } else if (ready) playReadyWidget();
    else if (initializing) publish({ status: 'loading', error: '' });
    else initialize();
  };
  const retry = () => {
    if (disposed) return;
    if (ready) { desiredPlaying = true; playReadyWidget(); return; }
    generation++;
    detachWidget();
    cancelApiLoad?.();
    desiredPlaying = true;
    initialize();
  };
  const setVolume = volume => {
    const value = Number(volume);
    if (!Number.isFinite(value) || disposed) return;
    const vol = Math.max(0, Math.min(100, value));
    publish({ vol });
    if (ready) widget.setVolume(vol);
  };
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    generation++;
    desiredPlaying = false;
    detachWidget();
    cancelApiLoad?.();
    iframe?.removeAttribute('src');
  };
  return { toggle, retry, setVolume, destroy, get state() { return state; } };
}

export function useBgm() {
  const [state, setState] = useState(INITIAL_STATE);
  const controller = useRef(null);
  useEffect(() => {
    const instance = createBgmController({ iframe: document.getElementById('sc-iframe'), onChange: setState });
    controller.current = instance;
    return () => { instance.destroy(); controller.current = null; };
  }, []);
  return {
    ...state, trackUrl: BGM_TRACK_URL,
    toggle: () => controller.current?.toggle(),
    retry: () => controller.current?.retry(),
    setVolume: volume => controller.current?.setVolume(volume),
  };
}
