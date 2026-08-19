export type ObservableEvent = 'modify';

export type ObserveTarget = 'property';

export type TargetValueType = 'text' | 'number' | 'boolean' | 'list';

export interface Rule {
	expectedValue: string;
	targetProperty: string;
	targetValue: string;
	targetType: TargetValueType;
}

export interface Observable {
	id: string;
	name: string;
	event: ObservableEvent;
	observe: ObserveTarget;
	property: string;
	rules: Rule[];
}

export interface SentrySettings {
	observables: Observable[];
}
