import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { seedMapPlaces, studentMapPlaces } from '../seeders/mapPlaces.js';

test('seis lugares reales: carga inicial, actualización y preservación de ediciones', {skip:!process.env.TEST_DB_NAME}, async () => {
  if (!process.env.TEST_DB_NAME.endsWith('_test')) throw new Error('Se exige una base exclusiva de pruebas.');
  const db=createDatabase({db:{host:process.env.TEST_DB_HOST||'127.0.0.1',port:Number(process.env.TEST_DB_PORT||3306),database:process.env.TEST_DB_NAME,username:process.env.TEST_DB_USER||'root',password:process.env.TEST_DB_PASSWORD||''}});
  const models=defineModels(db); const institutionIds=[];
  try {
    for (const name of ['001-initial','002-careers','003-institution-resources','004-origin-localities','005-national-origin','005-questions','006-answers','007-answer-votes','008-moderation','009-places','010-groups','011-place-admin']) await (await import(`../migrations/${name}.js`)).up(db,models);
    for (const name of ['Universidad Nacional de Formosa (UNaF)','Instituto Politécnico Formosa (IPF)']) institutionIds.push((await models.Institution.create({name,sourceUrl:'https://example.com'})).id);
    const oldSource='https://servicios.infoleg.gob.ar/infolegInternet/anexos/410000-414999/412386/res566.pdf';
    await models.Place.create({slug:'unaf-campus',name:'Campus de la UNaF',kind:'institution',institutionId:institutionIds[0],addressLabel:'Av. Dr. Luis Gutnisky 3200, ciudad de Formosa',sourceType:'official',sourceUrl:oldSource,reviewedAt:'2026-11-08',status:'published'});
    await models.Place.create({slug:'unaf-rectorado',name:'Rectorado de la UNaF',kind:'institution',addressLabel:'Don Bosco 1082, ciudad de Formosa',sourceType:'official',sourceUrl:oldSource,reviewedAt:'2026-11-08',status:'published'});
    await db.transaction(transaction=>seedMapPlaces(models,transaction));
    const rows=await models.Place.findAll({where:{slug:studentMapPlaces.map(item=>item.slug)}});
    assert.equal(rows.length,6);
    for(const item of studentMapPlaces){const row=rows.find(row=>row.slug===item.slug);assert.equal(Number(row.latitude),Number(item.latitude.toFixed(6)));assert.equal(Number(row.longitude),Number(item.longitude.toFixed(6)));assert.equal(row.kind,item.kind);assert.equal(row.sourceType,'community');assert.equal(row.sourceUrl,item.sourceUrl);}
    assert.equal((await models.Place.findOne({where:{slug:'unaf-rectorado'}})).status,'draft');
    const custom=rows.find(row=>row.slug==='ipf-campus');
    await custom.update({name:'IPF — edición de administración',studentNote:'Dato editado por administración',hiddenAt:new Date()});
    await db.transaction(transaction=>seedMapPlaces(models,transaction));
    await custom.reload();assert.equal(custom.name,'IPF — edición de administración');assert.ok(custom.hiddenAt);
    assert.equal(await models.Place.count({where:{slug:studentMapPlaces.map(item=>item.slug)}}),6);
  } finally {
    await models.Place.destroy({where:{slug:[...studentMapPlaces.map(item=>item.slug),'unaf-rectorado']}});
    if(institutionIds.length)await models.Institution.destroy({where:{id:institutionIds}});
    await db.close();
  }
});
