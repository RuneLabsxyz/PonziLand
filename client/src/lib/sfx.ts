import { Howl, Howler } from 'howler';

const claimSound = new Howl({ src: [] });

const sfx = {
  playSound: (soundFile: string) => {
    const sound = new Howl({
      src: [soundFile],
      html5: true, // Use HTML5 Audio for larger files
    });
    sound.play();
  },
  claim: () => {
    claimSound.play();
  },
  // You can add more methods for different sounds if needed
};

// Export the sfx object for use in other files
export default sfx;
