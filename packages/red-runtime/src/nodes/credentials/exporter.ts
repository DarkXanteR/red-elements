import {
  Context,
  delegateTarget,
  lazyInject,
  $TYPES
} from '../_base'

const TYPES = $TYPES.all

import {
  crypto
} from '../../_libs'

import {
  NodeCredentials,
  INodeCredentials
} from './'
import { ILogger } from '../../log/logger';
import { ISettings } from '../../index';

export interface INodeCredentialsExporter {
  /**
   * Export credentials
   */
  export(): Promise<any>
}

@delegateTarget()
export class NodeCredentialsExporter extends Context implements INodeCredentialsExporter {
  @lazyInject(TYPES.logger) $log: ILogger
  @lazyInject(TYPES.settings) $settings: ISettings

  constructor(public nodeCredentials: INodeCredentials) {
    super()
  }

  /**
   * Export credentials
   */
  async export(): Promise<any> {
    const {
      nodeCredentials,
      rebind,
      $log,
      $settings,
    } = this

    const {
      markDirty,
      markClean,
    } = rebind([
        'markDirty',
        'markClean',
      ], nodeCredentials)

    let {
      removeDefaultKey
    } = nodeCredentials

    const {
      dirty,
      credentialCache,
      encryptedCredentials,
      encryptionEnabled,
      encryptionAlgorithm,
      encryptionKey
    } = nodeCredentials

    var result = credentialCache;
    if (encryptionEnabled) {
      if (dirty) {
        try {
          $log.debug("red/runtime/nodes/credentials.export : encrypting");
          var initVector = crypto.randomBytes(16);
          var cipher = crypto.createCipheriv(encryptionAlgorithm, encryptionKey, initVector);
          result = {
            "$": initVector.toString('hex') + cipher.update(JSON.stringify(credentialCache), 'utf8', 'base64') + cipher.final('base64')
          };
        } catch (err) {
          $log.warn($log.t("nodes.credentials.error-saving", {
            message: err.toString()
          }))
        }
      } else {
        result = encryptedCredentials;
      }
    }

    markClean()

    if (removeDefaultKey) {
      $log.debug("red/runtime/nodes/credentials.export : removing unused default key");
      return $settings.delete('_credentialSecret').then(function () {
        removeDefaultKey = false;
        return result;
      })
    } else {
      return await result
    }
  }
}
