import { User } from '../'
import { UserServer } from './';

import {
  IButton,
  IDialogElem
} from '../../../_interfaces'

import {
  Context,
  delegator,
  delegateTo,
  delegateTarget,
  container,
  SessionsApi
} from './_base'

@delegateTarget({
  container,
})
export class ServerLogin extends Context {
  constructor(public userServer: UserServer) {
    super()
  }

  get sessionsApi() {
    return this.userServer.sessionsApi
  }

  get user() {
    return this.userServer.user
  }

  async login(opts) {
    const {
      onUserLoginSuccess,
      onUserLoginError
    } = this
    this.sessionsApi.configure({
      url: 'auth/login'
    })
    try {
      const result = await this.sessionsApi.login({})
      onUserLoginSuccess(result, opts)
    } catch (error) {
      onUserLoginError(error)
    }
  }

  onUserLoginSuccess(data, opts) {
    const {
      dialog
    } = opts

    const {
      onLoginSuccess
    } = this.rebind([
        'onLoginSuccess'
      ], this.user.login)

    var i = 0;
    onLoginSuccess({ data, opts })

    if (opts.cancelable) {
      const cancelButton = <IButton>$("#node-dialog-login-cancel")

      cancelButton.button().click(function (event) {
        const loginDialog = <IDialogElem>$("#node-dialog-login")
        loginDialog.dialog('destroy').remove();
      });
    }

    var loginImageSrc = data.image || "red/images/node-red-256.png";

    // TODO: fix
    const loadUrl = 'unknown'
    const loadData = {}
    $("#node-dialog-login-image").load(loadUrl, loadData, () => {
      dialog.dialog("open");
    }).attr("src", loginImageSrc);
  }

  onUserLoginError(error) {
    const {
      jqXHR,
      textStatus,
      errorThrown
    } = error
    this.handleError(`login: ${textStatus}`, {
      jqXHR
    })
  }
}
