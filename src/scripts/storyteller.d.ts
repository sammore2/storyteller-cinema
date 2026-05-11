import { StorytellerAPI } from "./core/api";
import { SkinManager } from "./core/skin-manager";

declare global {
  // 1. Global API
  interface Window {
    StorytellerCinema: StorytellerAPI & {
      skins?: SkinManager;
    };
  }

  // 2. LibWrapper
  const libWrapper: {
    register: (module: string, target: string, fn: Function, type: string) => void;
  };

  // 3. Extender o Registro de Configurações do Foundry
  namespace ClientSettings {
    interface Values {
        [key: string]: any;
    }
  }

  // 4. Globais do Foundry (Removi PIXI daqui para usar o oficial)
  const game: any;
  const canvas: any;
  const Hooks: any;
  const ui: any;
  const foundry: any;
}

export {};
