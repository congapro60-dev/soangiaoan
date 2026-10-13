"use client";
import React from "react";
import MathText from "./MathText";
type Item = {id:string;label:string};
type Task = {id:string;inputSchema?:Record<string,unknown>;evaluation?:{checkerId?:string;answerKey?:unknown}};
export function StructuredQuestionEditor({task,onChange}:{task:Task;onChange:(schema:Record<string,unknown>,answerKey:unknown)=>void}) {
 const schema=task.inputSchema||{},items=(schema.items||[]) as Item[],categories=(schema.categories||[]) as Item[];
 const ordering=task.evaluation?.checkerId==="ordering_exact";
 const order=Array.isArray(task.evaluation?.answerKey)?task.evaluation.answerKey as string[]:items.map(item=>item.id);
 const mapping=(!ordering&&task.evaluation?.answerKey&&typeof task.evaluation.answerKey==="object"?task.evaluation.answerKey:{}) as Record<string,string>;
 const save=(nextItems:Item[],nextCategories=categories,nextKey:unknown=ordering?order:mapping)=>onChange({...schema,items:nextItems,...(ordering?{}:{categories:nextCategories})},nextKey);
 return <fieldset><legend>{ordering?"Sắp xếp thứ tự":"Phân loại theo nhóm"}</legend>
 <p>{ordering?"Nhập thẻ ở thứ tự ban đầu. Xếp đáp án đúng bên dưới.":"Tạo nhóm phân loại, nhập các thẻ rồi chọn nhóm đúng cho từng thẻ."}</p>
 {!ordering&&<div><h4>Nhóm phân loại</h4>{categories.map((category,index)=><label key={category.id} style={{display:"block"}}>Tên nhóm {index+1}<input className="lesson-input" value={category.label} maxLength={300} onChange={e=>save(items,categories.map(item=>item.id===category.id?{...item,label:e.target.value}:item))}/><button type="button" className="lesson-button lesson-button-outline" onClick={()=>save(items,categories.filter(item=>item.id!==category.id),Object.fromEntries(Object.entries(mapping).filter(([,id])=>id!==category.id)))}>Xóa nhóm {index+1}</button></label>)}<button className="lesson-button" type="button" disabled={categories.length>=16} onClick={()=>save(items,[...categories,{id:crypto.randomUUID(),label:"Nhóm mới"}])}>Thêm nhóm</button></div>}
 <h4>Thẻ ban đầu</h4>{items.map((item,index)=><div key={item.id}><label>Thẻ {index+1}<input className="lesson-input" value={item.label} maxLength={300} onChange={e=>save(items.map(card=>card.id===item.id?{...card,label:e.target.value}:card))}/></label>
 {!ordering&&<label>Nhóm đúng<select className="lesson-select" value={mapping[item.id]||""} onChange={e=>save(items,categories,{...mapping,[item.id]:e.target.value})}><option value="">Chọn nhóm</option>{categories.map(category=><option key={category.id} value={category.id}>{category.label}</option>)}</select></label>}
 <button className="lesson-button lesson-button-outline" type="button" onClick={()=>save(items.filter(card=>card.id!==item.id),categories,ordering?order.filter(id=>id!==item.id):Object.fromEntries(Object.entries(mapping).filter(([id])=>id!==item.id)))}>Xóa thẻ {index+1}</button></div>)}
 <button className="lesson-button" type="button" disabled={items.length>=32} onClick={()=>{const card={id:crypto.randomUUID(),label:"Thẻ mới"};save([...items,card],categories,ordering?[...order,card.id]:mapping);}}>Thêm thẻ</button>
 {ordering&&<div><h4>Thứ tự đáp án đúng</h4>{order.map((id,index)=><p key={id}>{index+1}. <MathText text={items.find(item=>item.id===id)?.label}/><button className="lesson-button lesson-button-outline" type="button" aria-label={`Đưa thẻ ${index+1} lên`} disabled={index===0} onClick={()=>{const next=[...order];[next[index-1],next[index]]=[next[index],next[index-1]];save(items,categories,next);}}>Lên</button><button className="lesson-button lesson-button-outline" type="button" aria-label={`Đưa thẻ ${index+1} xuống`} disabled={index===order.length-1} onClick={()=>{const next=[...order];[next[index+1],next[index]]=[next[index],next[index+1]];save(items,categories,next);}}>Xuống</button></p>)}</div>}
 </fieldset>;
}
