import { action, observable } from "mobx";

export class AppStore {
  @observable public theme: number;
  @observable public snackmsg = "";
  @observable public snackopen: boolean = false;
  @observable public settingsOpen: boolean = false;
  @observable public sort_type: number = 0;
  @observable public sort_direction: number = 0;

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
  @action
  public toggleSort = (type, direction): void => {
    this.sort_type = type;
    this.sort_direction = direction || +!this.sort_direction;
  }

}

export default AppStore;
