// Side-effect module: main.jsx imports it FIRST, so personal localStorage
// keys are namespaced per profile before any other module (or a module-level
// read) touches storage. ES imports evaluate in order, so a call in
// main.jsx's body would come too late.
import { installProfileStorage } from './profileStorage';

installProfileStorage();
