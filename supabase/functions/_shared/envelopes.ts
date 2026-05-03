// Prompt envelopes — versioned templates that wrap the raw user prompt
// to preserve identity / produce specific styles.
// Each envelope returns { prompt, version }.

type EnvOut = { prompt: string; version: string };

function fill(t: string, vars: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export const ENVELOPES = {
  scene_swap: (userExtra = ""): EnvOut => ({
    version: "scene_swap@v1",
    prompt:
      `Place the woman from the SECOND reference @img2 into the exact scene, setting and pose shown in the FIRST reference @img1. Match the lighting, atmosphere, position, color grading, clothes of first reference, framing and composition of the first image perfectly. Preserve the woman's facial features, hair, body shape, tattoos, piercings and overall identity exactly from the second image. Photorealistic editorial portrait, natural skin texture, sharp focus, professional photography. no tatoos, no glasses, ${userExtra}`,
  }),

  dresser: (userExtra = ""): EnvOut => ({
    version: "dresser@v1",
    prompt:
      `Dress the person from the FIRST reference @img1 with the OUTFIT shown in the SECOND reference @img2. Preserve the person's exact face, hair, skin tone, tattoos, body shape, pose, framing, camera angle, background, scene and lighting from the FIRST image. Replace ONLY the outfit, matching the SECOND image's color, fabric, print, cut, straps and details exactly. Photorealistic, natural skin texture, sharp focus. ${userExtra}`,
  }),

  hot: (userExtra = ""): EnvOut => ({
    version: "hot@v1",
    prompt:
      `Edit the FIRST reference image @img1 according to the instructions, using the SECOND reference @img2 as visual guide. Preserve the identity (face, hair, body) of the main subject. Photorealistic, natural skin texture, sharp focus. ${userExtra}`,
  }),

  product: (userPrompt: string, aspect = "1:1"): EnvOut => ({
    version: "product@v1",
    prompt:
      `Editorial product photography. Studio softbox lighting, seamless gradient backdrop, micro-contrast on materials, ${aspect} hero composition, no AI artifacts on logos/text.\n\nProduct brief: ${userPrompt}`,
  }),

  ecommerce: (userPrompt: string): EnvOut => ({
    version: "ecommerce@v1",
    prompt:
      `E-commerce hero shot for marketplace listing. Clean white or contextual background, product centered, accurate color reproduction, sharp focus front-to-back, no extraneous props.\n\nBrief: ${userPrompt}`,
  }),

  character: (userPrompt: string): EnvOut => ({
    version: "character@v1",
    prompt:
      `Character reference sheet style. Full-body neutral pose, T-pose optional, even diffuse lighting, neutral grey backdrop, sharp on facial features, accurate proportions for downstream re-use as identity reference.\n\nCharacter: ${userPrompt}`,
  }),

  r3d: (userPrompt: string): EnvOut => ({
    version: "r3d@v1",
    prompt:
      `Octane render, 3D character/asset, isometric or three-quarter view, subsurface scattering, studio HDRI lighting, ZBrush sculpt detail, sharp PBR materials, clean white or neutral grey backdrop.\n\nSubject: ${userPrompt}`,
  }),

  assets: (userPrompt: string): EnvOut => ({
    version: "assets@v1",
    prompt:
      `${userPrompt}, isolated on pure white background, studio lighting, centered, no shadow, sharp edges, single subject only, no text or logos.`,
  }),

  marketing: (userPrompt: string, aspect = "1:1"): EnvOut => ({
    version: "marketing@v1",
    prompt:
      `Marketing visual aligned with brand brief. Editorial-grade photography, ${aspect} composition, strong focal hierarchy, copy-friendly negative space.\n\nBrief: ${userPrompt}`,
  }),

  cinema_shot: (
    userPrompt: string,
    n: number,
    total: number,
    personaDesc?: string,
    camera?: string,
    lens?: string,
    mood?: string,
  ): EnvOut => ({
    version: "cinema_shot@v1",
    prompt: fill(
      `Cinematic still, frame {N}/{TOTAL}, 21:9 anamorphic, 35mm film grain, color graded teal/orange or as scene dictates. Coherent character and wardrobe across all shots.\n\n{SUBJECT}Scene: {USER}\n\nCamera: {CAMERA}. Lens: {LENS}. Mood: {MOOD}.`,
      {
        N: String(n),
        TOTAL: String(total),
        USER: userPrompt,
        SUBJECT: personaDesc ? `Subject (consistent across all shots): ${personaDesc}.\n` : "",
        CAMERA: camera || "medium close-up, eye-level",
        LENS: lens || "50mm f/1.8",
        MOOD: mood || "intimate",
      },
    ),
  }),

  image_default: (userPrompt: string, aspect: string): EnvOut => ({
    version: "image_default@v1",
    prompt: /aspect|ratio|\d+:\d+/i.test(userPrompt)
      ? userPrompt
      : `${userPrompt}\n\nAspect ratio: ${aspect}.`,
  }),
};
