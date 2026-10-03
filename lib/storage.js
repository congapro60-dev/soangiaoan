import {env} from 'cloudflare:workers';
export function db(){if(!env.DB)throw Error('Database unavailable');return env.DB;}
export function stmt(sql,...values){return db().prepare(sql).bind(...values);}
export function getEnv(){return env;}
