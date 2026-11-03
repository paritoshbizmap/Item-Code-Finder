// Copyright (c) 2026, bizmap and contributors
// For license information, please see license.txt

frappe.ui.form.on("Item Code Generation Request", {
	refresh(frm) {
		// Hide Add Row button
		frm.fields_dict["missing_variants"].grid.wrapper
			.find(".grid-add-row")
			.hide();

		frm.fields_dict["missing_variants"].grid.cannot_add_rows = true;
	},
	
	// add_bom_details(frm) {
	// 	if (frm.doc.docstatus == 1 || frm.doc.docstatus == 2) {
	// 		return;
	// 	}

	// 	let selected_rows =
	// 		frm.fields_dict.missing_variants.grid.get_selected_children();

	// 	if (!selected_rows || selected_rows.length === 0) {
	// 		frappe.throw(__('Please select at least one Missing Variant row'));
	// 	}

	// 	// ❗ MULTIPLE selection handling
	// 	if (selected_rows.length > 1) {
	// 		let has_bom = selected_rows.some(r => r.bom_details_json);

	// 		// 🚫 Block overwrite if any row already has BOM
	// 		if (has_bom) {
	// 			frappe.throw(
	// 				__('Multiple rows selected with existing BOM. Please select only one row to edit.')
	// 			);
	// 		}

	// 		open_bom_dialog(frm, selected_rows, null);
	// 		return;
	// 	}

	// 	// ✅ SINGLE row
	// 	let row = selected_rows[0];
	// 	let bom_data = null;

	// 	if (row.bom_details_json) {
	// 		try {
	// 			bom_data = JSON.parse(row.bom_details_json);
	// 		} catch (e) {
	// 			console.error("Invalid BOM JSON", e);
	// 		}
	// 	}

	// 	open_bom_dialog(frm, selected_rows, bom_data);
	// },

	onload(frm) {
		frm.fields_dict["missing_variants"].grid.cannot_add_rows = true;
	},

	validate(frm) {
		(frm.doc.missing_variants || []).forEach(row => {
			if (!row.attribute_json) return;

			let attrs = JSON.parse(row.attribute_json);

			attrs.forEach(d => {
				if (!d.attribute || d.value == null) return;

				if (d.numeric_values) {
					validate_numeric_attribute_js(
						d.attribute,
						d.value,
						d.from_range,
						d.to_range,
						d.increment
					);
				}
			});
		});
	}
});


function validate_numeric_attribute_js(attribute, value, from_range, to_range, increment) {
	const allowed = [];

	const from = flt(from_range, 3);
	const to = flt(to_range, 3);
	const step = flt(increment, 3);

	if (step <= 0) {
		frappe.throw(__("Increment must be greater than 0"));
	}

	const steps = Math.floor((to - from) / step);

	for (let i = 0; i <= steps; i++) {
		allowed.push(flt(from + (i * step), 3).toFixed(3));
	}

	if (!allowed.includes(flt(value, 3).toFixed(3))) {
		frappe.throw(
			__(`${value} is not a valid value for Attribute ${attribute}`)
		);
	}
}


// // 🔵 DIALOG
// function open_bom_dialog(frm, selected_rows, bom_data = null) {

// 	let dialog = new frappe.ui.Dialog({
// 		title: 'BOM & Routing Details',
// 		size: 'large',
//         data: [],  
// 		fields: [
// 			{
// 				fieldtype: 'Link',
// 				fieldname: 'routing',
// 				label: 'Routing',
// 				options: 'Routing',
// 				reqd: 1
// 			},
// 			{ fieldtype: 'Section Break' },
// 			{
// 				fieldname: 'bom_details',
// 				fieldtype: 'Table',
// 				label: 'BOM Details',
// 				in_place_edit: true,
// 				fields: [
// 					{
// 						fieldtype: 'Link',
// 						fieldname: 'item_code',
// 						label: 'Item Code',
// 						options: 'Item',
// 						in_list_view: 1,
// 						reqd: 1,
// 						onchange: function () {
// 							let row = this.grid_row.doc;
// 							if (!row.item_code) return;

// 							frappe.db.get_value(
// 								'Item',
// 								row.item_code,
// 								['item_name', 'stock_uom'],
// 								(r) => {
// 									if (r) {
// 										row.item_name = r.item_name;
// 										row.uom = r.stock_uom;
// 										dialog.fields_dict.bom_details.grid.refresh();
// 									}
// 								}
// 							);
// 						}
// 					},
// 					{
// 						fieldtype: 'Data',
// 						fieldname: 'item_name',
// 						label: 'Item Name',
// 						read_only: 1,
// 						in_list_view: 1
// 					},
// 					{
// 						fieldtype: 'Float',
// 						fieldname: 'qty',
// 						label: 'Quantity',
// 						reqd: 1,
// 						in_list_view: 1
// 					},
// 					{
// 						fieldtype: 'Link',
// 						fieldname: 'uom',
// 						label: 'UOM',
// 						options:'UOM',
// 						in_list_view: 1
// 					}
// 				]
// 			}
// 		],

// 		primary_action_label: 'Generate JSON',

// 		primary_action(values) {

// 			if (!values.bom_details || values.bom_details.length === 0) {
// 				frappe.confirm(
// 					__('No BOM items added. Continue with only Routing?'),

// 					() => {
// 						proceed_with_json(frm, values, selected_rows, dialog);
// 					},

// 					() => {}
// 				);

// 				return;
// 			}

// 			proceed_with_json(frm, values, selected_rows, dialog);
// 		}
// 	});

// 	dialog.show();

// 	// PREFILL 
// 	if (bom_data && Array.isArray(bom_data) && bom_data.length > 1) {

//         let bom_items = bom_data[1] || [];

//         if (bom_data[0]?.routing) {
//             dialog.set_value('routing', bom_data[0].routing);
//         }

//         let formatted_data = bom_items.map(item => ({
//             item_code: item.item_code,
//             item_name: item.item_name,
//             qty: item.quantity,
//             uom: item.uom
//         }));

//         // console.log("FINAL DATA:", formatted_data);

//         dialog.fields_dict.bom_details.df.data = formatted_data;
//         dialog.fields_dict.bom_details.grid.refresh();
//     }
// }


// function proceed_with_json(frm, values, selected_rows, dialog) {

// 	let bom_items = (values.bom_details || []).map(row => {
// 		return {
// 			item_code: row.item_code,
// 			item_name: row.item_name,
// 			quantity: row.qty,
// 			uom: row.uom
// 		};
// 	});

// 	let bom_json = [
// 		{ routing: values.routing },
// 		bom_items
// 	];

// 	let bom_json_string = JSON.stringify(bom_json);

// 	(selected_rows || []).forEach(row => {
// 		row.bom_details_json = bom_json_string;
// 	});

// 	frm.refresh_field('missing_variants');

// 	dialog.hide();
// }