import { stories } from '../../projects/ui/src/stories';

export const routes = ['/gallery', ...Object.keys(stories).map((name) => `/gallery/${name}`)];
