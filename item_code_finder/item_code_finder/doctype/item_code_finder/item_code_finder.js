// Copyright (c) 2026, bizmap and contributors
// For license information, please see license.txt


frappe.ui.form.on("Item Code Finder", {

    refresh(frm) {
        // Hide Add Row button in missing varinats table
        frm.fields_dict["missing_variants"].grid.wrapper
            .find(".grid-add-row")
            .hide();

        // Hide Add Row button in Attribute Table
        frm.fields_dict['attribute_table'].grid.wrapper.find('.grid-add-row').hide();

        // Hidding Add Row button for Existing Variants Table
        frm.fields_dict['existing_variants'].grid.wrapper.find('.grid-add-row').hide();


        // Hide save button
        frm.disable_save();

       

            //  Create new Part code Generation Requestion button & Data passing to new doc
            frm.add_custom_button('Create Part Code Generation Request', () => {


                //  Validation on click
                if (!frm.doc.item_group) {
                    frappe.throw(__('Item Group must contain a value'));
                }

                // if(!frm.doc.item_sub_category){
                //     frappe.throw(__('Item Sub Category must contain a value'))
                // }

                if (!frm.doc.missing_variants || frm.doc.missing_variants.length === 0) {
                    frappe.throw(__('Missing Variants table must contain at least one row'));
                }

                // Create new target doc
                frappe.new_doc('Item Code Generation Request', {}, doc => {
                    

                // Map parent fields
                doc.item_group = frm.doc.item_group;
                // doc.item_sub_category = frm.doc.item_sub_category;
                doc.creation_time = frappe.datetime.now_datetime();
                doc.requested_by = frappe.session.user;

                // Map child table
                (frm.doc.missing_variants || []).forEach(row => {
                    let child = frappe.model.add_child(
                        doc,
                        'missing_variants'
                    );

                    child.variant_of = row.variant_of;
                    child.missing_variant_code = row.missing_variant_code;
                    child.item_name = row.item_name;
                    child.description = row.description;
                    child.weight_per_unit = row.weight_per_unit;
                    child.weight_uom = row.weight_uom;
                    child.attribute_json = row.attribute_json;
                    child.suffix_no = row.suffix_no;
                });
                });
            })
        


        // toggle_code_generation_request(frm);

        frm.fields_dict["missing_variants"].grid.cannot_add_rows = true;
        frm.fields_dict['existing_variants'].grid.cannot_add_rows = true;
        frm.fields_dict['attribute_table'].grid.cannot_add_rows = true;
        refresh_all_attribute_options(frm);


    //      frm.fields_dict.attribute_table.grid.refresh();

    // (frm.doc.attribute_table || []).forEach(row => {
    //     load_attribute_value_options(frm, row.doctype, row.name);
    // });
    },

    onload(frm) {
        // Hiding add new row button for table
        frm.fields_dict["missing_variants"].grid.cannot_add_rows = true;
        frm.fields_dict['existing_variants'].grid.cannot_add_rows = true;
        frm.fields_dict['attribute_table'].grid.cannot_add_rows = true;

        refresh_all_attribute_options(frm);
    },

    // item_group: function(frm) {
    //     frm.set_query("item_sub_category", function() {
    //         return {
    //             filters: {
    //                 item_group: frm.doc.item_group
    //             }
    //         };
    //     });
    // },

    attribute_table_on_form_rendered(frm) {
        (frm.doc.attribute_table || []).forEach(row => {
            if (row.item_attribute) {
                load_attribute_value_options(frm, row.doctype, row.name);
            }
        });
    },


    item_group(frm) {
        frm.clear_table("attribute_table");
        frm.clear_table("missing_variants");
        frm.clear_table("existing_variants");

        frm.set_value({
            item_code: "",
            item_name: ""
        });

        // if (!frm.doc.item_sub_category) {
        //     frm.refresh_field("attribute_table");
        //     frm.refresh_field("existing_variants");
        //     frm.refresh_field("missing_variants");
        //     return;
        // }


        frappe.db.get_doc("Item Group", frm.doc.item_group)
            .then(doc => {
                // ✅ cache this
                // frm._include_prefix = doc.include_prefix;

                (doc.custom_attribute_table || []).forEach(r => {
                    let row = frm.add_child("attribute_table");
                    row.item_attribute = r.item_attribute;
                });

                frm.refresh_field("attribute_table");

                setTimeout(() => {
                    refresh_all_attribute_options(frm);
                }, 100);
            });
    },


    async search_variants(frm) {

        if (!frm.doc.item_group) {
            frappe.throw(__("Item Group is required"));
        }

        // if(!frm.doc.item_sub_category){
        //     frappe.throw(__("Item Sub Category is required"))
        // }

        const filled_rows = (frm.doc.attribute_table || [])
            .filter(r => r.item_attribute && r.item_attribute_value);

        if (!filled_rows.length) {
            frappe.throw(__("Please select at least one attribute value"));
        }

        const attributes = filled_rows.map(r => ({
            attribute: r.item_attribute,
            value: r.item_attribute_value
        }));

        try {

            show_custom_loader(__("Fetching variants..."));

            const r = await frappe.call({
                method: "item_code_finder.item_code_finder.doctype.item_code_finder.item_code_finder.search_variants",
                args: {
                    item_group: frm.doc.item_group,
                    attributes: attributes
                },

                // native frappe loader
                // freeze: true,
                // freeze_message: __("Fetching variants...")
            });

            hide_custom_loader();
            frm.clear_table("existing_variants");

            const msg = r.message;

            // CASE 1 : No items exist
            if (msg?.no_items) {

                frappe.msgprint({
                    title: __("No Items Found"),
                    message: __("No variants exist for this Item Group."),
                    indicator: "orange"
                });

                return;
            }

            // CASE 2 : Variants found
            if (Array.isArray(msg) && msg.length) {

                msg.forEach(d => {
                    let row = frm.add_child("existing_variants");
                    row.item_code = d.item_code;
                    row.item_name = d.item_name;
                });

                frm.refresh_field("existing_variants");
                return;
            }

            // CASE 3 : No exact match
            const all_rows = frm.doc.attribute_table || [];

            const all_selected =
                all_rows.length &&
                all_rows.every(r => r.item_attribute && r.item_attribute_value);

            if (all_selected) {

                await handle_missing_variant(frm, all_rows);

            } else {

                frappe.msgprint({
                    title: __("No Exact Variant"),
                    message: __(
                        "No variant found for selected attributes. Missing variant will only be logged when all attributes are selected."
                    ),
                    indicator: "orange"
                });

            }

        } catch (err) {

            hide_custom_loader();
            console.error(err);

            frappe.msgprint({
                title: __("Error"),
                message: __("Something went wrong while fetching variants."),
                indicator: "red"
            });

        }
    },

    add_missing_variant: async function(frm) {

        const rows = frm.doc.attribute_table || [];

        if (!rows.length) {
            frappe.msgprint("No attributes found");
            return;
        }

        // partial attributes
        const selected_rows = rows.filter(r => r.item_attribute);

        if (!selected_rows.length) {
            frappe.msgprint("Select at least one attribute");
            return;
        }

        // 1: Get variant_of
        let variant_of = "";

        try {
            const res = await frappe.call({
                method: "item_code_finder.item_code_finder.doctype.item_code_finder.item_code_finder.get_variant_template",
                args: {
                    item_group: frm.doc.item_group
                }
            });

            variant_of = res.message || "";

        } catch (e) {
            console.error(e);
        }

        //  2: Build attribute JSON
        let attribute_json = [];

        selected_rows.forEach(r => {
            attribute_json.push({
                attribute: r.item_attribute,
                value: r.item_attribute_value || null
            });
        });

        // let res = await frappe.call({
        //     method: "item_code_finder.item_code_finder.doctype.item_code_finder.item_code_finder.process_auto_increment_attributes",
        //     args: {
        //         attribute_json: JSON.stringify(attribute_json)
        //     }
        // });

        // update with processed values
        // attribute_json = JSON.parse(res.message);

        //  3: Generate Missing Variant Code 
        let missing_variant_code = "";

        if (variant_of) {

            let parts = [];

            for (const r of selected_rows) {

                // if (!r.item_attribute_value) {
                //     continue;
                // }

                const val = r.item_attribute_value || "auto";
                const abbr = await get_attribute_value_abbr(
                    r.item_attribute,
                    val
                );

                // const abbr = await get_attribute_value_abbr(
                //     r.item_attribute,
                //     r.item_attribute_value
                // );

                parts.push(abbr);
            }

            // missing_variant_code = `${variant_of}-${parts.join("-")}`;

            missing_variant_code = frm._include_prefix
                ? `${variant_of}-${parts.join("-")}`
                : parts.join("-");
        }

        // 4: Prevent duplicate
        if (
            missing_variant_code &&
            (frm.doc.missing_variants || []).some(
                r => r.missing_variant_code === missing_variant_code
            )
        ) {
            frappe.msgprint("This variant already exists in Missing Variants");
            return;
        }

        // 5: Add row
        let row = frm.add_child("missing_variants");

        row.variant_of = variant_of;
        row.missing_variant_code = missing_variant_code;
        row.attribute_json = JSON.stringify(attribute_json);

        // description
        row.description = build_description(frm, row.attribute_json);

        // optional flag
        row.is_incomplete = selected_rows.some(r => !r.item_attribute_value) ? 1 : 0;

        frm.refresh_field("missing_variants");

        frappe.msgprint({
            title: "Added",
            message: "Missing variant logged successfully",
            indicator: "green"
        });
    }


})


// For missing varinat on single button click
async function handle_missing_variant(frm, filled_rows) {
    // Check if template exists
    const res = await frappe.call({
        method: "item_code_finder.item_code_finder.doctype.item_code_finder.item_code_finder.get_variant_template",
        args: {
            item_group: frm.doc.item_group
        }
    });

    const variant_of = res.message || null;

    // Build missing variant code (if template exists)
    let missing_code = "";

    if (variant_of) {
        missing_code = await build_missing_variant_code(
            frm,
            filled_rows,
            variant_of
        );
    }

    // Avoid duplicate missing entries
    if (
        missing_code &&
        (frm.doc.missing_variants || []).some(
            r => r.missing_variant_code === missing_code
        )
    ) {
        return;
    }

    let row = frm.add_child("missing_variants");
    row.variant_of = variant_of || "";
    row.missing_variant_code = missing_code;
    row.attribute_json = await build_attribute_json(filled_rows);

    // description
    row.description = build_description(frm, row.attribute_json);

    frm.refresh_field("missing_variants");

    frappe.msgprint({
        title: __("Variant Missing"),
        message: __("This variant does not exist and has been logged."),
        indicator: "red"
    });
}




frappe.ui.form.on("Variant Table", {

    item_attribute(frm, cdt, cdn) {
        frappe.model.set_value(cdt, cdn, "item_attribute_value", "");
        load_attribute_value_options(frm, cdt, cdn);
    },

    item_attribute_value(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        // add new attribute
        if (row.item_attribute_value === "➕ Create New Value") {
            handle_create_new_attribute_value(frm, cdt, cdn, row);
            return;
        }

        debounced_find_item(frm);
    },


    // form_render(frm, cdt, cdn) {
    //     load_attribute_value_options(frm, cdt, cdn);
    // },

    attribute_table_remove(frm) {
        frm.set_value({
            item_code: "",
            item_name: ""
        });
    }
});



function refresh_all_attribute_options(frm) {
    setTimeout(() => {
        (frm.doc.attribute_table || []).forEach(row => {
            load_attribute_value_options(frm, row.doctype, row.name);
        });
    }, 100);
}


function load_attribute_value_options(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row || !row.item_attribute) return;

    frappe.db.get_doc("Item Attribute", row.item_attribute)
        .then(doc => {

            let values = [];

            // 🔑 NUMERIC ATTRIBUTE
            if (doc.numeric_values) {

                const from = flt(doc.from_range, 3);
                const to = flt(doc.to_range, 3);
                const step = flt(doc.increment, 3);


                if (from <= to && step > 0) {
                    const steps = Math.floor((to - from) / step);

                    for (let i = 0; i <= steps; i++) {
                        const val = flt(from + (i * step), 3);
                        values.push(val.toFixed(3)); // STRING
                    }
                }

            // 🔑 NON-NUMERIC ATTRIBUTE
            } else {
                values = (doc.item_attribute_values || [])
                    .map(v => v.attribute_value);
            }

            // 🔐 Add "Create New" ONLY for NON-numeric attributes
            if (!doc.numeric_values) {
                // values.push("➕ Create New Value");
                values.unshift("➕ Create New Value");
            }

            const options = ["", ...values].join("\n");
            let grid_row = frm.fields_dict.attribute_table.grid.get_row(cdn);

            if (grid_row && grid_row.docfields) {
                let df = grid_row.docfields.find(d => d.fieldname === "item_attribute_value");
                if (df) {
                    df.options = options;
                }


}

    

frm.fields_dict.attribute_table.grid.refresh();

            // const grid_row =
            //     frm.fields_dict.attribute_table.grid.get_row(cdn);

            // if (grid_row) {
            //     grid_row.refresh_field("item_attribute_value");
            // }

            // 🔐 RESET INVALID VALUE (TYPE SAFE)
                if (row.item_attribute_value) {

                    if (doc.numeric_values) {
                        // numeric validation
                        const normalized = flt(row.item_attribute_value, 3).toFixed(3);

                        if (!values.includes(normalized)) {
                            frappe.model.set_value(cdt, cdn, "item_attribute_value", "");
                        }

                    } else {
                        // string validation
                        if (!values.includes(row.item_attribute_value)) {
                            frappe.model.set_value(cdt, cdn, "item_attribute_value", "");
                        }
                    }
                }

        });
}


let last_checked_variant_key = null;


async function try_find_item_code(frm) {
    if (!frm.doc.item_group) return;

    const rows = frm.doc.attribute_table || [];

    if (
        !rows.length ||
        !rows.every(r => r.item_attribute && r.item_attribute_value)
    ) {
        frm.clear_table("existing_variants");
        frm.refresh_field("existing_variants");
        return;
    }

    const variant_key = JSON.stringify(
        rows.map(r => `${r.item_attribute}:${r.item_attribute_value}`)
    );

    if (last_checked_variant_key === variant_key) return;
    last_checked_variant_key = variant_key;

    show_custom_loader(__("Checking variant..."));
    frappe.call({
        method: "item_code_finder.item_code_finder.doctype.item_code_finder.item_code_finder.find_item_variant",
        args: {
            item_group: frm.doc.item_group,
            attributes: rows.map(r => ({
                attribute: r.item_attribute,
                value: r.item_attribute_value
            }))
        },

        callback: async (r) => {

            const current_key = JSON.stringify(
                (frm.doc.attribute_table || []).map(
                    r => `${r.item_attribute}:${r.item_attribute_value}`
                )
            );

            //  Stop loader for stale response
            if (current_key !== variant_key) {
                // hide_variant_loader_msg();
                hide_custom_loader(); 
                return;
            }

            frm.clear_table("existing_variants");

            // Variant found
            if (r.message?.item_code) {
                const row = frm.add_child("existing_variants");
                row.item_code = r.message.item_code;
                row.item_name = r.message.item_name;

                frm.refresh_field("existing_variants");

                // hide_variant_loader_msg();
                hide_custom_loader();
                return;
            }

            // Variant missing
            if (r.message?.no_template) {
                await log_missing_variant(frm, rows, null);
            } else {
                await log_missing_variant(frm, rows, r.message?.variant_of);
            }

            if (last_variant_not_found_key !== variant_key) {
                last_variant_not_found_key = variant_key;

                frappe.msgprint({
                    title: __("Variant Not Found"),
                    message: __("This variant does not exist."),
                    indicator: "red"
                });
            }

            // hide_variant_loader_msg();
            hide_custom_loader();
        },

        //  Stop loader on API error
        error: function () {
            // hide_variant_loader_msg();
            hide_custom_loader();
        }
    });
}




const debounced_find_item = frappe.utils.debounce(
    frm => try_find_item_code(frm),
    500
);




let last_variant_not_found_key = null;

async function get_attribute_value_abbr(attribute, value) {
    const doc = await frappe.db.get_doc("Item Attribute", attribute);

    const row = (doc.item_attribute_values || []).find(
        r => r.attribute_value === value
    );

    return (row?.abbr || value)
        .replace(/\s+/g, "_");
}

// async function build_missing_variant_code(frm, rows, variant_of) {
//     const parts = [];

//     for (const r of rows) {
//         const abbr = await get_attribute_value_abbr(
//             r.item_attribute,
//             r.item_attribute_value
//         );
//         parts.push(abbr);
//     }

//     return `${variant_of}-${parts.join("-")}`;
// }


async function build_missing_variant_code(frm, rows, variant_of) {
    const parts = [];

    for (const r of rows) {
        const abbr = await get_attribute_value_abbr(
            r.item_attribute,
            r.item_attribute_value
        );
        parts.push(abbr);
    }

    return frm._include_prefix
        ? `${variant_of}-${parts.join("-")}`
        : parts.join("-");
}


function missing_variant_exists(frm, code) {
    return (frm.doc.missing_variants || []).some(
        row => row.missing_variant_code === code
    );
}



async function log_missing_variant(frm, rows, variant_of) {

    const row = frm.add_child("missing_variants");

    row.variant_of = variant_of || "";
    // row.missing_variant_code = variant_of
    //     ? await build_missing_variant_code(frm, rows, variant_of)
    //     : "";

    row.missing_variant_code = await build_missing_variant_code(frm, rows, variant_of);

    row.attribute_json = await build_attribute_json(rows);

    // description
    row.description = build_description(frm, row.attribute_json);

    frm.refresh_field("missing_variants");
}


async function build_attribute_json(rows) {
    const result = [];

    for (const r of rows) {
        const value = await normalize_attribute_value(
            r.item_attribute,
            r.item_attribute_value
        );

        result.push({
            attribute: r.item_attribute,
            value: value
        });
    }

    return JSON.stringify(result);
}


async function normalize_attribute_value(attribute, value) {
    const attr = await frappe.db.get_doc("Item Attribute", attribute);

    // Numeric attribute → format
    if (attr.numeric_values === 1) {
        return flt(value).toFixed(3);
    }

    //  Non-numeric → PRESERVE STRING
    return String(value);
}



// Add Attribute from Attribute Table AutoComplete field
async function handle_create_new_attribute_value(frm, cdt, cdn, row) {

    //  Safety: ensure attribute exists
    if (!row.item_attribute) {
        frappe.msgprint("Please select Item Attribute first");
        return;
    }

    //  Safety: block numeric attributes
    const attr_doc = await frappe.db.get_doc("Item Attribute", row.item_attribute);

    if (attr_doc.numeric_values) {
        frappe.msgprint("Cannot create values for numeric attributes");
        frappe.model.set_value(cdt, cdn, "item_attribute_value", "");
        return;
    }

    frappe.prompt(
        [
            {
                label: "New Attribute Value",
                fieldname: "new_value",
                fieldtype: "Data",
                reqd: 1
            },
            {
                label: "Abbreviation",
                fieldname: "abbr",
                fieldtype: "Data"
            }
        ],
        async (data) => {

            //  AUTO CAPITALIZE + CLEAN
            let abbr = (data.abbr || data.new_value || "")
                .toUpperCase()
                .replace(/\s+/g, "_")
                .trim();

            const doc = await frappe.db.get_doc("Item Attribute", row.item_attribute);

            //  Prevent duplicate
            const exists = (doc.item_attribute_values || []).some(
                d => d.attribute_value.toLowerCase() === data.new_value.toLowerCase()
            );

            if (exists) {
                frappe.msgprint("Attribute value already exists");
                return;
            }

            //  Push correct structure
            doc.item_attribute_values.push({
                attribute_value: data.new_value,
                abbr: abbr
            });

            await frappe.call({
                method: "frappe.client.save",
                args: { doc }
            });

            frappe.show_alert({
                message: "Attribute Value Added",
                indicator: "green"
            });

            // Refresh options
            load_attribute_value_options(frm, cdt, cdn);

            // Set selected value
            frappe.model.set_value(cdt, cdn, "item_attribute_value", data.new_value);
        },
        "Create New Attribute Value"
    );

    //  Clear temporary selection
    frappe.model.set_value(cdt, cdn, "item_attribute_value", "");
}


// Description building

function build_description(frm, attribute_json) {
    let parts = [];

    // 1. Item Name (if exists)
    if (frm.doc.item_name) {
        parts.push(frm.doc.item_name);
    }

    // 2. Item Group
    if (frm.doc.item_group) {
        parts.push(frm.doc.item_group);
    }

    // 3. Item Sub Category
    // if (frm.doc.item_sub_category) {
    //     parts.push(frm.doc.item_sub_category);
    // }

    // 4. Attributes
    try {
        // let attrs = JSON.parse(attribute_json || "[]");

        // let attr_text = attrs.map(a => {
        //     return `${a.attribute}: ${a.value}`;
        // });

        // if (attr_text.length) {
        //     parts.push(attr_text.join(", "));
        // }

        let attrs = JSON.parse(attribute_json || "[]");

        let attr_text = attrs
            .filter(a => a.attribute && a.value !== null && a.value !== "")
            .map(a => `${a.attribute}: ${a.value}`);

        if (attr_text.length) {
            parts.push(attr_text.join(", "));
        }

    } catch (e) {
        console.error("Invalid attribute_json", e);
    }

    return parts.join(" , ");
}



// // loader
// function show_custom_loader(message = "Loading...") {
//     if (document.getElementById("custom-item-loader")) return; // already shown

//     const loader_html = `
//         <div id="custom-item-loader" style="
//             position: fixed;
//             top: 0; left: 0; right: 0; bottom: 0;
//             background: rgba(255,255,255,0.6);
//             z-index: 9999;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             flex-direction: column;
//         ">
//             <div class="custom-spinner" style="
//                 width: 40px; height: 40px;
//                 border: 4px solid #ddd;
//                 border-top: 4px solid #5e64ff;
//                 border-radius: 50%;
//                 animation: custom-spin 0.8s linear infinite;
//             "></div>
//             <div style="margin-top: 10px; font-weight: 500; color: #333;">
//                 ${message}
//             </div>
//         </div>
//         <style>
//             @keyframes custom-spin {
//                 0% { transform: rotate(0deg); }
//                 100% { transform: rotate(360deg); }
//             }
//         </style>
//     `;

//     $("body").append(loader_html);
// }

// function hide_custom_loader() {
//     $("#custom-item-loader").remove();
// }




// // loader - second
// function show_custom_loader(message = "Loading...") {
//     if (document.getElementById("custom-item-loader")) return; // already shown

//     const loader_html = `
//         <div id="custom-item-loader" style="
//             position: fixed;
//             top: 0; left: 0; right: 0; bottom: 0;
//             background: rgba(255,255,255,0.5);
//             backdrop-filter: blur(3px);
//             -webkit-backdrop-filter: blur(3px);
//             z-index: 9999;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             opacity: 0;
//             transition: opacity 0.2s ease;
//         ">
//             <div style="
//                 background: #ffffff;
//                 padding: 28px 36px;
//                 border-radius: 12px;
//                 box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 flex-direction: column;
//                 min-width: 160px;
//             ">
//                 <div style="
//                     width: 36px; height: 36px;
//                     border: 3px solid #e5e7eb;
//                     border-top: 3px solid #5e64ff;
//                     border-right: 3px solid #5e64ff;
//                     border-radius: 50%;
//                     animation: custom-spin 0.7s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
//                 "></div>
//                 <div style="
//                     margin-top: 14px;
//                     font-size: 13px;
//                     font-weight: 500;
//                     color: #4b5563;
//                     letter-spacing: 0.2px;
//                 ">
//                     ${message}
//                 </div>
//             </div>
//         </div>
//         <style>
//             @keyframes custom-spin {
//                 0% { transform: rotate(0deg); }
//                 100% { transform: rotate(360deg); }
//             }
//         </style>
//     `;

//     $("body").append(loader_html);

//     // trigger fade-in
//     requestAnimationFrame(() => {
//         const el = document.getElementById("custom-item-loader");
//         if (el) el.style.opacity = "1";
//     });
// }

// function hide_custom_loader() {
//     const el = document.getElementById("custom-item-loader");
//     if (!el) return;

//     el.style.opacity = "0";
//     setTimeout(() => el.remove(), 200); // wait for fade-out to finish
// }



// loader
function show_custom_loader(message = "Loading...") {
    if (document.getElementById("custom-item-loader")) return; // already shown

    const loader_html = `
        <div id="custom-item-loader" style="
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: var(--modal-backdrop-bg, rgba(0,0,0,0.4));
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.15s ease;
        ">
            <div style="
                background: var(--card-bg, var(--fg-color));
                border: 1px solid var(--border-color);
                padding: 24px 32px;
                border-radius: var(--border-radius-md, 8px);
                box-shadow: var(--shadow-lg, 0 4px 16px rgba(0,0,0,0.15));
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                min-width: 150px;
            ">
                <div style="
                    width: 32px; height: 32px;
                    border: 3px solid var(--gray-200);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: custom-spin 0.6s linear infinite;
                "></div>
                <div style="
                    margin-top: 12px;
                    font-size: var(--text-sm, 12px);
                    font-weight: 500;
                    color: var(--text-muted);
                ">
                    ${message}
                </div>
            </div>
        </div>
        <style>
            @keyframes custom-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;

    $("body").append(loader_html);

    requestAnimationFrame(() => {
        const el = document.getElementById("custom-item-loader");
        if (el) el.style.opacity = "1";
    });
}

function hide_custom_loader() {
    const el = document.getElementById("custom-item-loader");
    if (!el) return;

    el.style.opacity = "0";
    setTimeout(() => el.remove(), 150);
}