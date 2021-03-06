import {
  BaseApi,
  IBaseApi
} from '../base'

import {
  CreateDeployments,
  ICreateDeployments
} from './create';

export interface IDeploymentsApi extends IBaseApi {
  create: ICreateDeployments
}

export class DeploymentsApi extends BaseApi {
  basePath = 'deployments'

  public create: CreateDeployments

  constructor(config?: any) {
    super(config)
  }
}
