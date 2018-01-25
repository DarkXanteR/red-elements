import {
  BaseApiMethod
} from './_base'
import { IApiId, BaseApiId } from './_id';

export interface IApiDelete extends IApiId {
}

export class BaseApiDelete extends BaseApiId implements IApiDelete {
  public httpMethod = 'delete'
}
