import Popup from '@src/popup/Popup.svelte';
import { mount } from 'svelte';

const app = mount(Popup, {
	target: document.getElementById('popup')!
});

export default app;
