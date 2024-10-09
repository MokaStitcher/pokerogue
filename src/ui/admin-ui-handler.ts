import BattleScene from "#app/battle-scene";
import { ModalConfig } from "./modal-ui-handler";
import { Mode } from "./ui";
import * as Utils from "../utils";
import { FormModalUiHandler } from "./form-modal-ui-handler";
import { Button } from "#app/enums/buttons";
import { TextStyle } from "./text";

export default class AdminUiHandler extends FormModalUiHandler {

  private adminMode: AdminMode;
  private adminResult: AdminSearchInfo; // this is the username that we're looking for
  private config: ModalConfig;
  private readonly httpUserNotFoundErrorCode: number = 204; // this is the http response from the server when a username isn't found in the server. This has to be the same error the server is giving
  private readonly buttonGap = 10;
  private readonly ERR_REQUIRED_USERNAME: string = "Username is required";
  private readonly ERR_REQUIRED_DISCORD: string = "Discord Id is required";
  private readonly ERR_REQUIRED_USERNAME_OR_DISCORD: string = "Username  or discord Id is required";
  private readonly SUCCESS_DISCORD_LINKED: string = "Username and discord successfully linked";
  private readonly SUCCESS_DISCORD_UNLINKED: string = "Username and discord successfully unlinked";
  private readonly SUCCESS_GOOGLE_LINKED: string = "Username and google successfully linked";
  private readonly SUCCESS_GOOGLE_UNLINKED: string = "Username and google successfully unlinked";
  private readonly ERR_USERNAME_NOT_FOUND: string = "Username not found!";
  private readonly ERR_GENERIC_ERROR: string = "There was an error";

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
  }

  setup(): void {
    super.setup();
  }

  getModalTitle(config?: ModalConfig): string {
    return "Admin panel";
  }

  getFields(config?: ModalConfig): string[] {
    switch (this.adminMode) {
    case AdminMode.LINK:
      return ["Username", "Discord ID"];
    case AdminMode.SEARCH:
      return ["Username"];
    case AdminMode.ADMIN:
      return ["Username", "Discord ID", "Google ID", "Last played"];
    default:
      return [""];
    }
  }

  getWidth(config?: ModalConfig): number {
    return this.adminMode === AdminMode.ADMIN ? 180 : 160;
  }

  getMargin(config?: ModalConfig): [number, number, number, number] {
    return [0, 0, 0, 0];
  }

  getButtonLabels(config?: ModalConfig): string[] {
    switch (this.adminMode) {
    case AdminMode.LINK:
      return ["Link Account", "Cancel"];
    case AdminMode.SEARCH:
      return ["Find account", "Cancel"];
    default:
      return ["Activate ADMIN", "Cancel"];
    }
  }

  processInput(button: Button): boolean {
    if (button === Button.SUBMIT && this.submitAction) {
      this.submitAction();
      return true;
    }

    return false;
  }

  show(args: any[]): boolean {
    this.adminMode = args[1] as AdminMode;
    this.adminResult = args[2] ?? { username: "", discordId: "", googleId: "", lastLoggedIn: "" };
    const isMessageError = args[3];

    const fields = this.getFields();
    const hasTitle = !!this.getModalTitle();
    this.config = args[0] as ModalConfig;
    this.updateFields(fields, hasTitle);
    this.updateContainer(this.config);

    const labels = this.getButtonLabels();
    for (let i = 0; i < labels.length; i++) {
      this.buttonLabels[i].setText(labels[i]);
    }

    this.errorMessage.setPosition(10, (hasTitle ? 31 : 5) + 20 * (fields.length - 1) + 16 + this.getButtonTopMargin());
    if (isMessageError) {
      this.errorMessage.setColor(this.getTextColor(TextStyle.SUMMARY_PINK));
      this.errorMessage.setShadowColor(this.getTextColor(TextStyle.SUMMARY_PINK, true));
    } else {
      this.errorMessage.setColor(this.getTextColor(TextStyle.SUMMARY_GREEN));
      this.errorMessage.setShadowColor(this.getTextColor(TextStyle.SUMMARY_GREEN, true));
    }

    if (super.show(args)) {
      this.populateFields(this.adminMode, this.adminResult);
      const originalSubmitAction = this.submitAction;
      this.submitAction = (_) => {
        this.submitAction = originalSubmitAction;
        //const showMessage = (message, adminResult: AdminSearchInfo, isError: boolean) => {
        //  this.scene.ui.setMode(Mode.ADMIN, Object.assign(config, { errorMessage: message?.trim() }), this.adminMode, adminResult, isError);
        //  this.scene.ui.playError();
        //};
        const adminSearchResult: AdminSearchInfo = this.convertInputsToAdmin(); // this converts the input texts into a single object for use later
        const validFields = this.areFieldsValid(this.adminMode);
        if (validFields.error) {
          this.scene.ui.setMode(Mode.LOADING, { buttonActions: [] }); // this is here to force a loading screen to allow the admin tool to reopen again if there's an error
          return this.showMessage(validFields.errorMessage, adminSearchResult, true);
        }
        this.scene.ui.setMode(Mode.LOADING, { buttonActions: [] });
        if (this.adminMode === AdminMode.LINK) {
          this.adminLinkUnlink(adminSearchResult, "discord", "link");
          /*this.updateAdminPanelInfo(adminSearchResult, AdminMode.LINK);*/
          //return this.showMessage(this.SUCCESS_DISCORD_LINKED, adminSearchResult, false, config);
        } else if (this.adminMode === AdminMode.SEARCH) {
          //let adminResult: { adminSearchResult?: AdminSearchInfo, error: boolean, errorType?: string };
          this.adminSearch(adminSearchResult)
            .then(response => {
              //console.log("RESPONSE: " + response);
              //response?.adminSearchResult;
              //adminResult.adminSearchResult = response?.adminSearchResult && null;
              //adminResult.error = response?.error && false;
              //adminResult.errorType = response?.errorType && ""
              if (response.error) {
                let errorString: string;
                switch (response.errorType) {
                case "Error":
                  errorString = this.ERR_GENERIC_ERROR;
                  break;
                case "UsernameNotFound":
                  errorString = this.ERR_USERNAME_NOT_FOUND;
                  break;
                default:
                  errorString = this.ERR_GENERIC_ERROR;
                  break;
                }
                return this.showMessage(errorString, adminSearchResult, true);
              }
              console.log("RESPONSE.username: " + response?.adminSearchResult.username);
              console.log("RESPONSE.discordId: " + response?.adminSearchResult.discordId);
              console.log("RESPONSE.googleId: " + response?.adminSearchResult.googleId);
              console.log("RESPONSE.lastLoggedIn: " + response?.adminSearchResult.lastLoggedIn);
              this.updateAdminPanelInfo(response.adminSearchResult);
            });
          //console.log(results);
          //this.updateAdminPanelInfo(adminSearchResult);
          //});
          //response.then(value => {
          //  adminResult = value;
          //  console.log(adminResult);
          //  this.updateAdminPanelInfo(adminResult);
          //});

          //.then(value => {
          //  adminResult = value;
          //  this.updateAdminPanelInfo(adminResult);
          //});


          //Utils.apiFetch(`admin/account/admin-search?username=${encodeURIComponent(adminSearchResult.username)}`, true)
          //  .then(response => {
          //    if (!response.ok) { // error
          //      console.error(response);
          //    } else if (response.status === this.httpUserNotFoundErrorCode) { // username doesn't exist
          //      return showMessage("Username not found in the database", adminSearchResult, true);
          //    } else { // success
          //      response.json().then(jsonResponse => {
          //        adminSearchResult = jsonResponse;
          //        // we double revert here and below to go back 2 layers of menus
          //        //this.scene.ui.revertMode();
          //        //this.scene.ui.revertMode();
          //        this.updateAdminPanelInfo(adminSearchResult);
          //      });
          //    }
          //  })
          //  .catch((err) => {
          //    console.error(err);
          //    this.scene.ui.revertMode();
          //    this.scene.ui.revertMode();
          //  });
        }

        return false;
      };
      return true;
    }
    return false;

  }

  showMessage(message: string, adminResult: AdminSearchInfo, isError: boolean) {
    this.scene.ui.setMode(Mode.ADMIN, Object.assign(this.config, { errorMessage: message?.trim() }), this.adminMode, adminResult, isError);
    this.scene.ui.playError();
  }

  populateFields(adminMode: AdminMode, adminResult: AdminSearchInfo) {
    switch (adminMode) {
    case AdminMode.LINK:
      this.inputs[0].setText(adminResult.username);
      this.inputs[1].setText(adminResult.discordId);
      break;
    case AdminMode.SEARCH:
      this.inputs[0].setText(adminResult.username);
      break;
    case AdminMode.ADMIN:
      const lockedFields: string[] = ["username", "lastLoggedIn"];
      Object.keys(adminResult).forEach((aR, i) => {
        this.inputs[i].setText(adminResult[aR]);
        if (aR === "discordId" || aR === "googleId") {
          const nineSlice = this.inputContainers[i].list.find(iC => iC.type === "NineSlice");
          const img = this.scene.add.image(this.inputContainers[i].x + nineSlice.width + this.buttonGap, this.inputContainers[i].y + (Math.floor(nineSlice.height / 2)), adminResult[aR] === "" ? "link_icon" : "unlink_icon");
          img.setName(`adminBtn_${aR}`);
          img.setOrigin(0.5, 0.5);
          img.setScale(0.5);
          img.setInteractive();
          img.on("pointerdown", () => {
            this.adminLinkUnlink(this.convertInputsToAdmin(), "discord", adminResult[aR] === "" ? "link" : "unlink");
            this.scene.ui.setMode(Mode.LOADING, { buttonActions: [] });
            this.updateAdminPanelInfo(adminResult);
          });
          this.addInteractionHoverEffect(img);
          this.modalContainer.add(img);
        }
        if (lockedFields.includes(aR) || adminResult[aR] !== "") {
          this.inputs[i].setReadOnly(true);
        } else {
          this.inputs[i].setReadOnly(false);
        }
      });
      break;
    }
  }

  areFieldsValid(adminMode: AdminMode): { error: boolean; errorMessage?: string; } {
    switch (adminMode) {
    case AdminMode.LINK:
      if (!this.inputs[0].text) {
        return {
          error: true,
          errorMessage: this.ERR_REQUIRED_USERNAME
        };
      }
      if (!this.inputs[1].text) {
        return {
          error: true,
          errorMessage: this.ERR_REQUIRED_DISCORD
        };
      }
    case AdminMode.SEARCH:
      if (!this.inputs[0].text) {
        return {
          error: true,
          errorMessage: this.ERR_REQUIRED_USERNAME_OR_DISCORD
        };
      }
    }
    return {
      error: false
    };
  }

  convertInputsToAdmin(): AdminSearchInfo {
    return {
      username: this.inputs[0]?.node ? this.inputs[0].text : "",
      discordId: this.inputs[1]?.node ? this.inputs[1]?.text : "",
      googleId: this.inputs[2]?.node ? this.inputs[2]?.text : "",
      lastLoggedIn: this.inputs[3]?.node ? this.inputs[3]?.text : ""
    };
  }

  async adminSearch(adminSearchResult: AdminSearchInfo)/*: Promise<{ adminSearchResult?: AdminSearchInfo, error: boolean, errorType?: string }>*/ {
    try {
      //const response = await Utils.apiFetch(`admin/account/admin-search?username=${encodeURIComponent(adminSearchResult.username)}`, true);

      const adminInfo = await Utils.apiFetch(`admin/account/admin-search?username=${encodeURIComponent(adminSearchResult.username)}`, true);
      if (!adminInfo.ok) {
        console.error(adminInfo);
        console.log(adminSearchResult);
        return { adminSearchResult: adminSearchResult, error: true, errorType: "Error" };
      } else if (adminInfo.status === this.httpUserNotFoundErrorCode) { // username doesn't exist
        console.log(adminSearchResult);
        return { adminSearchResult: adminSearchResult, error: true, errorType: "UsernameNotFound" };
      } else {
        const adminInfoJson = await adminInfo.json();
        return { adminSearchResult: adminInfoJson, error: false };
      }


      //return await Utils.apiFetch(`admin/account/admin-search?username=${encodeURIComponent(adminSearchResult.username)}`, true)
      //  .then(response => {
      //    if (!response.ok) {
      //      console.error(response);
      //      console.log(adminSearchResult);
      //      return { adminSearchResult: adminSearchResult, error: true, errorType: "Error" };
      //    } else if (response.status === this.httpUserNotFoundErrorCode) { // username doesn't exist
      //      console.log(adminSearchResult);
      //      return { adminSearchResult: adminSearchResult, error: true, errorType: "UsernameNotFound" };
      //    }
      //    console.log(response);
      //    //const searchResults: AdminSearchInfo =
      //    return response.json().then(jsonResponse => {
      //      return jsonResponse() as AdminSearchInfo;
      //      //console.log(searchResults);
      //    });
      //    //return { adminSearchResult: searchResults, error: false };
      //  });



      //.then(response => {
      //  if (!response.ok) { // error
      //    console.error(response);
      //    console.log(adminSearchResult);
      //    return { adminSearchResult: adminSearchResult, error: true, errorType: "Error" };
      //  } else if (response.status === this.httpUserNotFoundErrorCode) { // username doesn't exist
      //    console.log(adminSearchResult);
      //    return { adminSearchResult: adminSearchResult, error: true, errorType: "UsernameNotFound" };
      //  }
      //  response.json().then(jsonResponse => {
      //    console.log(jsonResponse);
      //    return { adminSearchResult: jsonResponse, error: false };
      //  });
      //});
    } catch (err) {
      console.error(err);
      return { error: true, errorType: err };
    }
    //Utils.apiFetch(`admin/account/admin-search?username=${encodeURIComponent(adminSearchResult.username)}`, true)
    //  .then(response => {
    //    if (!response.ok) { // error
    //      console.error(response);
    //      return { adminSearchResult: adminSearchResult, error: true, errorType: "Error" };
    //    } else if (response.status === this.httpUserNotFoundErrorCode) { // username doesn't exist
    //      //return showMessage("Username not found in the database", adminSearchResult, true);
    //      return { adminSearchResult: adminSearchResult, error: true, errorType: "UsernameNotFound" };
    //    } else { // success
    //      response.json().then(jsonResponse => {
    //        adminSearchResult = jsonResponse;
    //        //this.updateAdminPanelInfo(adminSearchResult);
    //        return { adminSearchResult: adminSearchResult, error: false };
    //      });
    //    }
    //  })
    //  //.then(adminSearchResult => {
    //  //  return { adminSearchResult: adminSearchResult, error: true, errorType: "Weird spot" };
    //  //})
    //  .catch((err) => {
    //    console.error(err);
    //    this.scene.ui.revertMode();
    //    this.scene.ui.revertMode();
    //    return { adminSearchResult: adminSearchResult, error: true, errorType: err };
    //  });
  }

  adminLinkUnlink(adminSearchResult: AdminSearchInfo, service: string, mode: string) {
    Utils.apiPost(`admin/account/${service}-${mode}`, `username=${encodeURIComponent(adminSearchResult.username)}&discordId=${encodeURIComponent(adminSearchResult.discordId)}`, "application/x-www-form-urlencoded", true)
      .then(response => {
        if (!response.ok) {
          console.error(response);
          return this.showMessage(this.ERR_GENERIC_ERROR, adminSearchResult, true);
        } else if (response.status === this.httpUserNotFoundErrorCode) { // username doesn't exist
          //console.log(adminSearchResult);
          return this.showMessage(this.ERR_USERNAME_NOT_FOUND, adminSearchResult, true);
        } else {
          let successString: string;
          if (service === "discord") {
            successString = mode === "link" ? this.SUCCESS_DISCORD_LINKED : this.SUCCESS_DISCORD_UNLINKED;
          } else if (service === "google") {
            successString = mode === "link" ? this.SUCCESS_GOOGLE_LINKED : this.SUCCESS_GOOGLE_UNLINKED;
          }
          return this.showMessage(successString, adminSearchResult, false);
        }
        //// we double revert here and below to go back 2 layers of menus
        //this.scene.ui.revertMode();
        //this.scene.ui.revertMode();
      })
      .catch((err) => {
        console.error(err);
        this.scene.ui.revertMode();
        this.scene.ui.revertMode();
      });
  }

  updateAdminPanelInfo(adminSearchResult: AdminSearchInfo, mode?: AdminMode) {
    mode = mode ?? AdminMode.ADMIN;
    this.scene.ui.setMode(Mode.ADMIN, {
      buttonActions: [
        // we double revert here and below to go back 2 layers of menus
        () => {
          this.scene.ui.revertMode();
          this.scene.ui.revertMode();
        },
        () => {
          this.scene.ui.revertMode();
          this.scene.ui.revertMode();
        }
      ]
    }, mode, adminSearchResult);
  }

  clear(): void {
    super.clear();

    // this is used to remove the existing fields on the admin panel so they can be updated

    const itemsToRemove: string[] = ["formLabel", "adminBtn"]; // this is the start of the names for each element we want to remove

    //this.modalContainer.list = this.modalContainer.list.filter(mC => !itemsToRemove.some(iTR => mC.name.includes(iTR)));
    const removeArray: any[] = [];
    const mC = this.modalContainer.list;
    for (let i = mC.length - 1; i >= 0; i--) {
      /* This code looks for a few things before destroying the specific field; first it looks to see if the name of the element is %like% the itemsToRemove labels
       * this means that anything with, for example, "formLabel", will be true.
       * It then also checks for any containers that are within this.modalContainer, and checks if any of its child elements are of type rexInputText
       * and if either of these conditions are met, the element is destroyed
       */
      if (itemsToRemove.some(iTR => mC[i].name.includes(iTR)) || (mC[i].type === "Container" && mC[i].list.find(m => m.type === "rexInputText"))) {
        removeArray.push(mC[i]);
      }
    }

    while (removeArray.length > 0) {
      this.modalContainer.remove(removeArray.pop(), true);
    }
  }
}

export enum AdminMode {
  LINK,
  SEARCH,
  ADMIN
}

export function getAdminModeName(adminMode: AdminMode): string {
  switch (adminMode) {
  case AdminMode.LINK:
    return "Link";
  case AdminMode.SEARCH:
    return "Search";
  default:
    return "";
  }
}

export interface AdminSearchInfo {
  username: string;
  discordId: string;
  googleId: string;
  lastLoggedIn: string;
}
