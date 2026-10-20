import confetti from 'canvas-confetti';

// Interactive confetti effect on Get Started
const btnGetStarted = document.getElementById('hero-btn-get-started');
if (btnGetStarted) {
  btnGetStarted.addEventListener('click', () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  });
}
