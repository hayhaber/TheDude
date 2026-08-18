import dudestarIcon from './dudestar-icon.png';

// The app's brand mark — the user's own supplied DudeStar logo (a gold
// 3D star with a guitar headstock crossing it), cropped to just the icon
// (the "Dude Star" wordmark below it in the source artwork is dropped
// here since the sidebar already renders that as its own text label right
// next to this) and with its near-black background keyed to transparent
// so it sits cleanly on the sidebar's own surface color instead of
// showing as a black square. Used wherever the app's own name/logo
// belongs (the sidebar drawer header today), the same way a company or
// product logo sits at the top of its own navigation.
export function AppLogo({ size = 22 }) {
  return <img src={dudestarIcon} width={size} height={size} alt="" aria-hidden="true" style={{ display: 'block' }} />;
}
