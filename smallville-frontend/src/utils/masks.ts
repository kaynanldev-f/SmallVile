import { MaskOptions } from "@react-input/mask";

export const masks = {
  cpf: {
    mask: "___.___.___-__",
    replacement: { _: /\d/ },
  } satisfies Pick<MaskOptions, "mask" | "replacement">,

  phone: {
    mask: "(__) _____-____",
    replacement: { _: /\d/ },
  } satisfies Pick<MaskOptions, "mask" | "replacement">,

  cep: {
    mask: "_____-___",
    replacement: { _: /\d/ },
  } satisfies Pick<MaskOptions, "mask" | "replacement">,
  birthDate: {
    mask: "__/__/____",
    replacement: { _: /\d/ },
  },
  cardNumber: {
    mask: "____ ____ ____ ____ ___",
    replacement: { _: /\d/ },
  } satisfies Pick<MaskOptions, "mask" | "replacement">,

  cardExpiry: {
    mask: "__/__",
    replacement: { _: /\d/ },
  } satisfies Pick<MaskOptions, "mask" | "replacement">,

  cardCvv: {
    mask: "____",
    replacement: { _: /\d/ },
  } satisfies Pick<MaskOptions, "mask" | "replacement">,
};
