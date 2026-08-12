/**
 * Shared classes for the sidebar's icon-rail mode.
 *
 * Rail mode only applies from `md` up — below that the sidebar is a full-width
 * drawer — so these are driven by the `data-rail` attribute on the sidebar's
 * content wrapper rather than by conditional rendering.
 */

/** Hide an element when the sidebar is collapsed to icons */
export const RAIL_HIDDEN = "md:group-data-[rail=true]/sidebar:hidden";

/** Center a row's icon once its label is hidden */
export const RAIL_CENTER =
  "md:group-data-[rail=true]/sidebar:justify-center md:group-data-[rail=true]/sidebar:px-0";
