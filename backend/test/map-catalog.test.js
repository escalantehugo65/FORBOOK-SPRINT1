import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedMapPlaces, studentMapPlaces } from '../seeders/mapPlaces.js';
import { sequelize } from '../src/config/database.js';
import { Institution } from '../src/models/institution.model.js';
import { Place } from '../src/models/place.model.js';
import { runMigrations } from '../migrations/runner.js';

test('seis lugares reales: carga inicial, actualización y preservación de ediciones', {skip:!process.env.TEST_DB_NAME}, async () => {
  const institutionIds=[];
  try {
    await runMigrations();
    for (const name of ['Universidad Nacional de Formosa (UNaF)','Instituto Politécnico Formosa (IPF)']) institutionIds.push((await Institution.create({name,sourceUrl:'https://example.com'})).id);
    const oldSource='https://servicios.infoleg.gob.ar/infolegInternet/anexos/410000-414999/412386/res566.pdf';
    await Place.create({slug:'unaf-campus',name:'Campus de la UNaF',kind:'institution',institutionId:institutionIds[0],addressLabel:'Av. Dr. Luis Gutnisky 3200, ciudad de Formosa',sourceType:'official',sourceUrl:oldSource,reviewedAt:'2026-11-08',status:'published'});
    await Place.create({slug:'unaf-rectorado',name:'Rectorado de la UNaF',kind:'institution',addressLabel:'Don Bosco 1082, ciudad de Formosa',sourceType:'official',sourceUrl:oldSource,reviewedAt:'2026-11-08',status:'published'});
    await sequelize.transaction(transaction=>seedMapPlaces(transaction));
    const rows=await Place.findAll({where:{slug:studentMapPlaces.map(item=>item.slug)}});
    assert.equal(rows.length,6);
    for(const item of studentMapPlaces){const row=rows.find(row=>row.slug===item.slug);assert.equal(Number(row.latitude),Number(item.latitude.toFixed(6)));assert.equal(Number(row.longitude),Number(item.longitude.toFixed(6)));assert.equal(row.kind,item.kind);assert.equal(row.sourceType,'community');assert.equal(row.sourceUrl,item.sourceUrl);}
    assert.equal((await Place.findOne({where:{slug:'unaf-rectorado'}})).status,'draft');
    const custom=rows.find(row=>row.slug==='ipf-campus');
    await custom.update({name:'IPF — edición de administración',studentNote:'Dato editado por administración',hiddenAt:new Date()});
    await sequelize.transaction(transaction=>seedMapPlaces(transaction));
    await custom.reload();assert.equal(custom.name,'IPF — edición de administración');assert.ok(custom.hiddenAt);
    assert.equal(await Place.count({where:{slug:studentMapPlaces.map(item=>item.slug)}}),6);
  } finally {
    await Place.destroy({where:{slug:[...studentMapPlaces.map(item=>item.slug),'unaf-rectorado']}});
    if(institutionIds.length)await Institution.destroy({where:{id:institutionIds}});
    await sequelize.close();
  }
});
