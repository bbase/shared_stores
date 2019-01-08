import { action, observable } from "mobx";

export class AppStore {
  @observable public theme: number;
  @observable public snackmsg = "";
  @observable public snackopen: boolean = false;
  @observable public settingsOpen: boolean = false;

  constructor(theme = 0) {
    this.theme = theme;
  }
  @action
  public setTheme = (theme: number): void => {
    this.theme = theme;
  }

  @action
  public snackOpen = (state: boolean): void => {
    this.snackopen = state;
  }
  @action
  public setSnackMsg = (msg: string): void => {
    this.snackmsg = msg;
    this.snackOpen(true);
  }
  @action
  public toggleSettings = (): void => {
    this.settingsOpen = !this.settingsOpen;
  }

}

export default AppStore;
