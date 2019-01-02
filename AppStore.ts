import { action, observable } from "mobx";

export class AppStore {
  @observable public theme: number;
  @observable public snackmsg = "";
  @observable public snackopen: boolean = false;

  constructor(theme = 0) {
    this.theme = theme;
  }
  @action
  public setTheme = (theme: number): void => {
    this.theme = theme;
  }

  @action
  public snackOpen = (state) => {
    this.snackopen = state;
  }
  @action
  public setSnackMsg = (msg) => {
    this.snackmsg = msg;
    this.snackOpen(true);
  }

}

export default AppStore;
