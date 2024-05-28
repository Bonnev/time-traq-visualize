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

export default class AppSettings {
	static Metadata = AppSettingsMetadata;

	private alwaysHideGroups: string[] = [];
	private groupsToCopy: string[] = [];
	private groupsToExtract: ({[group: string]: string} | string)[] = [];

	static async loadSettings() {
		let settings;

		try {
			const data = await Neutralino.storage.getData(SETTINGS_NAME);
			settings = AppSettings.fromJSON(data);
		} catch (error: any) {
			if (error.code || error.code === 'NE_ST_NOSTKEX') {
				settings = new AppSettings();
			} else {
				throw error;
			}
		}

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

		return settings;
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

	static fromJSON(str: string) {
		return parseStorageObject(AppSettings, str);
	}
}