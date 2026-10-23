// Side-effect module: main.jsx imports it FIRST, so personal localStorage
// keys are namespaced per profile before any other module (or a module-level
// read) touches storage. ES imports evaluate in order, so a call in
// main.jsx's body would come too late.
import { installProfileStorage } from './profileStorage';
import { applyPendingAtBoot, trackChanges } from '../cloud/cloudState';

installProfileStorage();
// Cloud sync: what was pulled from the account last session is written now,
// before any screen reads its state; then every real change is tracked.
applyPendingAtBoot();
trackChanges();
