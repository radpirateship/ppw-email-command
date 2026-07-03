// Image generation presets — shared by /api/image and the Popups & Images UI.

export interface ImagePreset {
  label: string;
  suffix: string;
  size: string;
  usage: string;
}

export const IMAGE_PRESETS: Record<string, ImagePreset> = {
  hero: {
    label: "Email Hero",
    suffix:
      "wide cinematic hero shot, premium wellness brand aesthetic, clean, natural light, aspirational but grounded, subtle navy (#001A5C) and blue (#0A86CB) accent tones, minimal composition, no text overlay",
    size: "1536x1024",
    usage: "Email hero — display at 600px wide",
  },
  lifestyle: {
    label: "Lifestyle Scene",
    suffix:
      "realistic lifestyle photography, a healthy adult (30-55) using the product at home, warm natural light, premium home interior, authentic not staged, no text overlay",
    size: "1536x1024",
    usage: "Product-in-use sections, welcome emails",
  },
  banner: {
    label: "Popup Banner",
    suffix:
      "clean product-focused banner composition, premium wellness brand aesthetic, soft neutral background with navy (#001A5C) and blue (#0A86CB) accent tones, generous negative space for overlaid text, no text in image",
    size: "1024x1024",
    usage: "Klaviyo popup form background/side image",
  },
  background: {
    label: "Section Background",
    suffix:
      "subtle abstract background texture, calm premium wellness mood, soft gradients in navy (#001A5C), blue (#0A86CB) and off-white, very minimal, no objects, no text",
    size: "1536x1024",
    usage: "Email section dividers/backgrounds",
  },
  social: {
    label: "Social / Portrait",
    suffix:
      "portrait composition for social media, premium wellness brand aesthetic, natural light, aspirational, navy and blue accent tones, no text overlay",
    size: "1024x1536",
    usage: "Instagram/social 1080×1350",
  },
};
