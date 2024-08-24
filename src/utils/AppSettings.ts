import { MetadataBase, parseStorageObject, stringifyStorageObject } from './storageUtils';

import * as Neutralino from '@neutralinojs/lib';
import { toast } from 'react-toastify';

export const SETTINGS_NAME = 'settings';

interface AppSettingsMetadataType extends MetadataBase {
	version: number
}

const AppSettingsMetadata: AppSettingsMetadataType = {
	version: 1
};

const EditorSchema: object = {
	title: 'App Settings',
	type: 'object',
	options: {
		collapsed: true,
		disable_properties: true
	},
	properties: {
		alwaysHideGroups: {
			type: 'array',
			format: 'table',
			items: {
				type: 'string'
			}
		},
		groupsToCopy: {
			type: 'array',
			format: 'table',
			items: {
				type: 'string'
			}
		},
		groupsToExtract: {
			type: 'array',
			items: {
				type: 'object'
			}
		},
		itemsToRename: {
			type: 'array',
			items: {
				type: 'object'
			}
		}
	}
};

export default class AppSettings {
	static Metadata = AppSettingsMetadata;
	static Schema = EditorSchema;

	private alwaysHideGroups: string[] = [];
	private groupsToCopy: string[] = [];
	private groupsToExtract: ({[group: string]: string} | string)[] = [];
	private itemsToRename: ({[group: string]: string} | string)[] = [];

	private static SETTINGS_PROMISE: Promise<AppSettings | null> | null = null;
	private static SETTINGS: AppSettings | null = null;

	static async waitAndLoadSettings(): Promise<AppSettings | null> {
		if (AppSettings.SETTINGS_PROMISE) {
			// Reuse the existing promise if loading is already in progress
			return AppSettings.SETTINGS_PROMISE;
		}

		AppSettings.SETTINGS_PROMISE = this.loadSettings();

		return AppSettings.SETTINGS_PROMISE;
	}

	private static async loadSettings(): Promise<AppSettings | null> {
		if (this.SETTINGS) {
			return this.SETTINGS;
		}

		let settings;

		try {
			const data = await Neutralino.storage.getData(SETTINGS_NAME);
			settings = AppSettings.fromJSON(data);

			let commitDefaults = false;

			if (!settings.groupsToCopy.length) {
				settings.groupsToCopy = ['INFONDS-\\d+', 'DOC-\\d+', 'ENGSUPPORT-\\d+'];
				commitDefaults = true;
			}
			if (!settings.groupsToExtract.length) {
				settings.groupsToExtract = [{ ' - Personal - ': 'Personal' }];
				commitDefaults = true;
			}

			commitDefaults && settings.commit();

			AppSettings.SETTINGS = settings;
			return settings;
		} catch (error: any) {
			if (error.code || error.code === 'NE_ST_NOSTKEX') {
				settings = new AppSettings();
			} else {
				throw error;
			}
			return null;
		} finally {
			AppSettings.SETTINGS_PROMISE = null;
		}
	}

	commit() {
		Neutralino.storage
			.setData(SETTINGS_NAME, stringifyStorageObject(AppSettings, this))
			.catch((err: Neutralino.Error) => toast.error('Neutralino storage set error: ' + err.message));
	}

	getAlwaysHideGroups() {
		return this.alwaysHideGroups;
	}

	addGroupToAlwaysHide(group: string) {
		if (!this.alwaysHideGroups.includes(group)) {
			this.alwaysHideGroups.push(group);
		}
		this.commit();
	}

	getGroupsToCopy() {
		return this.groupsToCopy;
	}

	getGroupsToExtract() {
		return this.groupsToExtract.map(group => typeof group !== 'string' ? group : { [group]: group });
	}

	getItemsToRename() {
		return this.itemsToRename;
	}

	static fromJSON(str: string) {
		return parseStorageObject(AppSettings, str);
	}
}