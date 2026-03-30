import type { IOperationResult } from "@microsoft/power-apps/data";
import { getClient } from "@microsoft/power-apps/data";
import { dataSourcesInfo } from "../../../.power/schemas/appschemas/dataSourcesInfo";
import type { IGetAllOptions, IGetOptions } from "../models/CommonModels";
import type { Eamon_nbaplayerstatses, Eamon_nbaplayerstatsesBase } from "../models/Eamon_nbaplayerstatsesModel";

const dataSourceName = "eamon_nbaplayerstatses";
const client = getClient(dataSourcesInfo);

type Record = Omit<Eamon_nbaplayerstatsesBase, "eamon_nbaplayerstatsid">;

export class Eamon_nbaplayerstatsesService {
  static create(record: Record): Promise<IOperationResult<Eamon_nbaplayerstatses>> {
    return client.createRecordAsync<Record, Eamon_nbaplayerstatses>(dataSourceName, record);
  }

  static get(id: string, options?: IGetOptions): Promise<IOperationResult<Eamon_nbaplayerstatses>> {
    return client.retrieveRecordAsync<Eamon_nbaplayerstatses>(dataSourceName, id, options);
  }

  static getAll(options?: IGetAllOptions): Promise<IOperationResult<Eamon_nbaplayerstatses[]>> {
    return client.retrieveMultipleRecordsAsync<Eamon_nbaplayerstatses>(dataSourceName, options);
  }

  static update(id: string, changes: Partial<Record>): Promise<IOperationResult<Eamon_nbaplayerstatses>> {
    return client.updateRecordAsync<Partial<Record>, Eamon_nbaplayerstatses>(dataSourceName, id, changes);
  }

  static async delete(id: string): Promise<void> {
    await client.deleteRecordAsync(dataSourceName, id);
  }
}
