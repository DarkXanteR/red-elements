import {
  BaseApi
} from '../base'

export class LibraryApi extends BaseApi {
  basePath = 'libraries'

  constructor(config?: any) {
    super(config)
  }
}