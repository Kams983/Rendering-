import { FontLoader } from "three-stdlib";
import type { Typeface } from "./captionFit";

let data: Typeface | null = null;
let promise: Promise<Typeface> | null = null;

/** Loads the 3D typeface once, then serves it synchronously to the fit code. */
export const loadTypeface = (url: string): Promise<Typeface> => {
  if (!promise) {
    promise = new Promise<Typeface>((resolve, reject) => {
      new FontLoader().load(
        url,
        (font) => {
          data = font.data as unknown as Typeface;
          resolve(data);
        },
        undefined,
        () =>
          reject(
            new Error(
              "Missing 3D typeface: public/fonts/helvetiker_bold.typeface.json. " +
                "Text3D captions cannot render without it.",
            ),
          ),
      );
    }).catch((error) => {
      promise = null;
      throw error;
    });
  }
  return promise;
};

/** Available after the typeface gate resolves. */
export const getTypeface = (): Typeface | null => data;
