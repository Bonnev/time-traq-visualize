import { MetadataBase, parseStorageObject, stringifyStorageObject } from "./storageUtils";

import { toast } from 'react-toastify';

export const SETTINGS_NAME = 'settings';

interface AppSettingsMetadataType extends MetadataBase {
	version: number
};

const AppSettingsMetadata: AppSettingsMetadataType = {
	version: 1
};

export default class AppSettings {
	static Metadata = AppSettingsMetadata;

	private alwaysHideGroups: string[] = [];

	static loadSettings() {
		return Neutralino.storage
			.getData(SETTINGS_NAME)
			.then((str: string) => AppSettings.fromJSON(str))
			.catch((err: any) => {
				if (err.code || err.code === 'NE_ST_NOSTKEX') {
					return new AppSettings();
				}

				throw err;
			});
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



	static fromJSON(str: string) {
		return parseStorageObject(AppSettings, str)
	}
}