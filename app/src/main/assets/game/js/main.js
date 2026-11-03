'use strict';
// Boot.

Save.load();
Input.init();
World3D.init();
Bird3D.init();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (G.scene && G.scene.onSystemPause) G.scene.onSystemPause();
    Sound.suspend();
    Save.write();
  } else if (!(G.scene instanceof PlayScene && G.scene.state === 'pause')) {
    Sound.unlock();
  }
});

// Called by the Android activity when the app goes to the background / returns.
window.__app = {
  pause() { if (G.scene && G.scene.onSystemPause) G.scene.onSystemPause(); Sound.suspend(); Save.write(); },
  resume() { if (!(G.scene instanceof PlayScene && G.scene.state === 'pause')) Sound.unlock(); },
};

setScene(new TitleScene(), true);
requestAnimationFrame(frame);
