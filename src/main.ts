import { Notice, Plugin } from 'obsidian';
import { Observer } from './observer';
import { DEFAULT_SETTINGS, SentrySettingTab } from './settings';
import { SentrySettings } from './types';

export default class SentryPlugin extends Plugin {
	settings!: SentrySettings;
	private observer!: Observer;

	async onload() {
		await this.loadSettings();

		this.observer = new Observer(
			this.app.metadataCache,
			this.app.fileManager,
			() => this.settings,
		);
		this.observer.rebuildIndex();

		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file) {
					this.observer.captureSnapshot(file);
				}
			}),
		);

		this.registerEvent(
			this.app.metadataCache.on('changed', (file, data, cache) => {
				this.observer.handleChanged(file, data, cache);
			}),
		);

		this.addRibbonIcon('eye', 'Sentry', () => {
			new Notice('Sentry is watching.');
		});

		this.addSettingTab(new SentrySettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SentrySettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.observer.rebuildIndex();
	}
}
