import { openDB, type IDBPDatabase } from 'idb'
import type { TranslateVaultDB } from './schema'
import { migrate } from './migrations'
import { DB_NAME, DB_VERSION } from '../constants/app'

let dbInstance: IDBPDatabase<TranslateVaultDB> | null = null

export async function getDB(): Promise<IDBPDatabase<TranslateVaultDB>> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<TranslateVaultDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      migrate(db, oldVersion, newVersion ?? DB_VERSION)
    },
    blocked() {
      console.warn('[TV] DB upgrade blocked by another tab')
    },
    blocking() {
      dbInstance?.close()
      dbInstance = null
    },
  })
  return dbInstance
}
