import { mount } from 'svelte';
import Popup from '@src/popup/Popup.svelte';

const app = mount(Popup, {
    target: document.getElementById('popup')!,
});

export default app;
