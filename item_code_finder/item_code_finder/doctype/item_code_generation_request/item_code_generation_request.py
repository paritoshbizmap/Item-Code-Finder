# Copyright (c) 2026, bizmap and contributors
# For license information, please see license.txt

from frappe.model.document import Document
import frappe
import json
from frappe.model.document import Document
from erpnext.controllers.item_variant import create_variant


# from nido_hrms.nido_hrms.doctype.item import (
#     handle_variant_prefix_inline,
#     create_bom
# )


class ItemCodeGenerationRequest(Document):

    def on_submit(self):
        
        
        # Flag to avoid race condition
        # frappe.flags.in_part_code_generation = True
        
        
        try :

            # 1  Find template
            template_item = frappe.db.get_value(
                "Item",
                {
                    "item_group": self.item_group,
                    "has_variants": 1
                },
                "name"
            )

            # 2  Collect attributes
            attribute_set = set()

            for row in self.missing_variants:
                if not row.attribute_json:
                    continue

                for d in json.loads(row.attribute_json):
                    if d.get("attribute"):
                        attribute_set.add(d["attribute"])

            # 3  Create template if not exists
            if not template_item:
                template_item = create_item_template(self, attribute_set)

            # 4 Create variants
            for row in self.missing_variants:

                if row.created_item_code:
                    continue

                try:
                    frappe.db.savepoint("variant_creation")

                    attributes = json.loads(row.attribute_json)
                    attribute_map = {}

                    for d in attributes:
                        attr = d.get("attribute")
                        val = d.get("value")

                        if attr and val is not None:
                            attribute_map[attr] = val

                    #  Create variant
                    variant = create_variant(
                        item=template_item,
                        args=attribute_map
                    )

                    variant.item_group = self.item_group
                    # variant.custom_from_part_code_generation = 1 # check field for safety
                    
                    # setting item name & description
                    variant.item_name = row.item_name
                    variant.description = f"{row.item_name + ' , ' if row.item_name else ''}{row.description}"

                    # Add suffix
                    # if row.suffix_no:
                    #     variant.item_code = f"{variant.item_code}-{row.suffix_no}"
                        # variant.item_name = variant.description
                        
                        
                    # Adding weight Per unit
                    if row.weight_per_unit:
                        variant.weight_per_unit = row.weight_per_unit
                    
                    # Adding weight UOM
                    if row.weight_uom:
                        variant.weight_uom = row.weight_uom

                    variant.insert(ignore_permissions=True)

                    #  Rename immediately
                    # new_name = handle_variant_prefix_inline(variant)

                    #  Reload updated doc
                    # variant = frappe.get_doc("Item", new_name)

                    # BOM DETAILS
                    # if row.bom_details_json:
                    #     bom_json = json.loads(row.bom_details_json)

                    #     routing_info = bom_json[0] or {}
                    #     bom_items = bom_json[1] or []

                    #     variant.custom_routing = routing_info.get("routing")
                    #     variant.set("custom_bom_details", [])

                    #     for d in bom_items:
                    #         variant.append("custom_bom_details", {
                    #             "item": d.get("item_code"),
                    #             "item_name": d.get("item_name"),
                    #             "quantity": d.get("quantity"),
                    #             "uom": d.get("uom")
                    #         })

                    #     variant.save(ignore_permissions=True)

                        #  Create BOM AFTER rename
                        # create_bom(variant)

                    # 🔹 Update status
                    frappe.db.set_value(
                        row.doctype,
                        row.name,
                        {
                            "created_item_code": variant.name,
                            "variant_of": template_item,
                            "status": "Created"
                        }
                    )

                    frappe.db.commit()

                except Exception:
                    frappe.db.rollback(save_point="variant_creation")

                    frappe.db.set_value(
                        row.doctype,
                        row.name,
                        "status",
                        "Failed"
                    )

                    frappe.log_error(
                        message=frappe.get_traceback(),
                        title="Variant creation failed"
                    )
                    
        finally:
            #  ALWAYS RESET FLAG
            # frappe.flags.in_part_code_generation = False
            frappe.log_error(
                title="Item Code Status",
                message="Item code"
            )
                
                
                
                

# ✅ TEMPLATE CREATION (UNCHANGED)
def create_item_template(doc, attributes: set) -> str:

    if not doc.item_code or not doc.item_name:
        frappe.throw("Item Code and Item Name are mandatory")

    item = frappe.new_doc("Item")
    item.item_code = doc.item_code
    item.item_name = doc.item_name
    item.item_group = doc.item_group
    # item.custom_item_sub_category = doc.item_sub_category
    item.gst_hsn_code = doc.hsnsac

    item.has_variants = 1
    item.variant_based_on = "Item Attribute"
    item.stock_uom = doc.default_unit_of_measure
    item.is_stock_item = 1

    for attr in sorted(attributes):
        attr_doc = frappe.get_doc("Item Attribute", attr)

        row = item.append("attributes", {
            "attribute": attr,
            "numeric_values": attr_doc.numeric_values,
        })

        if attr_doc.numeric_values:
            row.from_range = attr_doc.from_range
            row.to_range = attr_doc.to_range
            row.increment = attr_doc.increment

    item.insert(ignore_permissions=True)

    return item.name




# Auto Increment 

# @frappe.whitelist()
# def process_auto_increment_attributes(attribute_json):
#     import json

#     data = json.loads(attribute_json)

#     for d in data:
#         if not d.get("attribute"):
#             continue

#         item_attr = frappe.get_doc("Item Attribute", d["attribute"])

#         # ✅ Skip if checkbox not enabled
#         if not item_attr.custom_is_auto_increment_:
#             continue

#         value = d.get("value")

#         # ✅ FIXED CONDITION
#         if value in [None, "", 0]:

#             # 🔍 Get last value properly
#             last_value = frappe.db.sql("""
#                 SELECT attribute_value 
#                 FROM `tabItem Attribute Value`
#                 WHERE parent=%s
#                 ORDER BY CAST(attribute_value AS UNSIGNED) DESC
#                 LIMIT 1
#             """, (d["attribute"]), as_dict=1)

#             if last_value:
#                 try:
#                     new_value = int(last_value[0].attribute_value) + 1
#                 except:
#                     frappe.throw(f"Last value for {d['attribute']} is not numeric")
#             else:
#                 new_value = 1

#             # ✅ assign value
#             d["value"] = str(new_value)
#             d["auto_generated"] = 1

#             # ✅ insert safely
#             item_attr.append("item_attribute_values", {
#                 "attribute_value": str(new_value)
#             })

#             item_attr.save(ignore_permissions=True)

#         else:
#             # user provided value
#             d["auto_generated"] = 0

#     return json.dumps(data)




# # test
# import frappe
# import time


# def check_bom_has_external_links(bom_name, item_code):
#     """
#     Check if BOM is linked to any document OTHER than Item or BOM itself.
#     """
#     blocked_by = []

#     link_fields_meta = frappe.get_all(
#         "DocField",
#         filters={"fieldtype": "Link", "options": "BOM"},
#         fields=["parent", "fieldname"]
#     )
#     custom_link_fields = frappe.get_all(
#         "Custom Field",
#         filters={"fieldtype": "Link", "options": "BOM"},
#         fields=["dt as parent", "fieldname"]
#     )

#     all_link_fields = link_fields_meta + custom_link_fields

#     seen = set()
#     unique_links = []
#     for l in all_link_fields:
#         key = (l.parent, l.fieldname)
#         if key not in seen:
#             seen.add(key)
#             unique_links.append(l)

#     for link in unique_links:
#         dt = link.parent
#         fieldname = link.fieldname

#         # Skip Item and BOM — internal, not external links
#         if dt in ("Item", "BOM"):
#             continue

#         try:
#             meta = frappe.get_meta(dt)
#         except Exception:
#             continue

#         if meta.istable:
#             try:
#                 results = frappe.get_all(
#                     dt,
#                     filters={fieldname: bom_name},
#                     fields=["name", "parent", "parenttype"],
#                     limit=3
#                 )
#                 for r in results:
#                     if r.get("parenttype") and r.get("parent"):
#                         if r.parenttype in ("Item", "BOM"):
#                             continue
#                         blocked_by.append(
#                             f"<b>{r.parenttype}</b>: "
#                             f"<a href='/app/{frappe.scrub(r.parenttype)}/{r.parent}'>"
#                             f"{r.parent}</a>"
#                         )
#             except Exception:
#                 continue
#         else:
#             try:
#                 results = frappe.get_all(
#                     dt,
#                     filters={fieldname: bom_name},
#                     fields=["name"],
#                     limit=3
#                 )
#                 for r in results:
#                     blocked_by.append(
#                         f"<b>{dt}</b>: "
#                         f"<a href='/app/{frappe.scrub(dt)}/{r.name}'>"
#                         f"{r.name}</a>"
#                     )
#             except Exception:
#                 continue

#     blocked_by = list(dict.fromkeys(blocked_by))
#     return len(blocked_by) > 0, blocked_by


# def check_item_has_non_bom_links(item_doc):
#     """
#     Check if Item is linked to any document OTHER than BOM.
#     """
#     blocked_by = []

#     link_fields_meta = frappe.get_all(
#         "DocField",
#         filters={"fieldtype": "Link", "options": "Item"},
#         fields=["parent", "fieldname"]
#     )
#     custom_link_fields = frappe.get_all(
#         "Custom Field",
#         filters={"fieldtype": "Link", "options": "Item"},
#         fields=["dt as parent", "fieldname"]
#     )

#     all_link_fields = link_fields_meta + custom_link_fields

#     seen = set()
#     unique_links = []
#     for l in all_link_fields:
#         key = (l.parent, l.fieldname)
#         if key not in seen:
#             seen.add(key)
#             unique_links.append(l)

#     for link in unique_links:
#         dt = link.parent
#         fieldname = link.fieldname

#         # ── Skip BOM and all its child tables entirely ────────────────────────
#         if dt in ("BOM", "BOM Item", "BOM Scrap Item", "BOM Operation",
#                   "BOM Explosion Item", "BOM Website Item"):
#             continue

#         # ── Skip the item doctype itself ──────────────────────────────────────
#         if dt == "Item":
#             continue

#         try:
#             meta = frappe.get_meta(dt)
#         except Exception:
#             continue

#         if meta.istable:
#             try:
#                 results = frappe.get_all(
#                     dt,
#                     filters={fieldname: item_doc.name},
#                     fields=["name", "parent", "parenttype"],
#                     limit=3
#                 )
#                 for r in results:
#                     if r.get("parenttype") and r.get("parent"):
#                         # Skip if parent doc is a BOM
#                         if r.parenttype == "BOM":
#                             continue
#                         blocked_by.append(
#                             f"<b>{r.parenttype}</b>: "
#                             f"<a href='/app/{frappe.scrub(r.parenttype)}/{r.parent}'>"
#                             f"{r.parent}</a>"
#                         )
#             except Exception:
#                 continue
#         else:
#             try:
#                 results = frappe.get_all(
#                     dt,
#                     filters={fieldname: item_doc.name},
#                     fields=["name"],
#                     limit=3
#                 )
#                 for r in results:
#                     blocked_by.append(
#                         f"<b>{dt}</b>: "
#                         f"<a href='/app/{frappe.scrub(dt)}/{r.name}'>"
#                         f"{r.name}</a>"
#                     )
#             except Exception:
#                 continue

#     blocked_by = list(dict.fromkeys(blocked_by))
#     return len(blocked_by) > 0, blocked_by


# def validate_and_delete(item_code, errors):
#     if not frappe.db.exists("Item", item_code):
#         return

#     item_doc = frappe.get_doc("Item", item_code)

#     # ── STEP 1: Get all BOMs for this item ────────────────────────────────────
#     bom_list = frappe.get_all(
#         "BOM",
#         filters={"item": item_code},
#         pluck="name"
#     )
#     bom_count = len(bom_list)

#     # ── STEP 2: Check each BOM for external links ─────────────────────────────
#     if bom_count > 0:
#         bom_link_errors = []
#         for bom_name in bom_list:
#             has_links, blocked_by = check_bom_has_external_links(bom_name, item_code)
#             if has_links:
#                 bom_link_errors.append(
#                     f"BOM <b>{bom_name}</b> is used in: "
#                     + ", ".join(blocked_by)
#                 )

#         if bom_link_errors:
#             errors.append(
#                 f"<b>{item_code}</b>: Cannot delete — one or more BOMs are "
#                 f"linked to other documents:<br>"
#                 + "<br>".join(f"&nbsp;&nbsp;• {e}" for e in bom_link_errors)
#                 + "<br><small>Please cancel/delete those documents first.</small>"
#             )
#             return

#     # ── STEP 3: Check Item for non-BOM links ──────────────────────────────────
#     has_item_links, item_blocked_by = check_item_has_non_bom_links(item_doc)
#     if has_item_links:
#         errors.append(
#             f"<b>{item_code}</b>: Cannot delete — item is linked to:<br>"
#             + "<br>".join(f"&nbsp;&nbsp;• {e}" for e in item_blocked_by)
#             + "<br><small>Please cancel/delete those documents first.</small>"
#         )
#         return

#     # ── STEP 4: All clear — cancel + delete all BOMs ─────────────────────────
#     for bom_name in bom_list:
#         try:
#             bom_doc = frappe.get_doc("BOM", bom_name)
#             if bom_doc.docstatus == 1:
#                 bom_doc.cancel()
#                 frappe.db.commit()
#             frappe.delete_doc("BOM", bom_name, force=1)
#             frappe.db.commit()
#         except Exception as e:
#             errors.append(
#                 f"<b>{item_code}</b>: Failed to delete BOM "
#                 f"<b>{bom_name}</b> — {str(e)}"
#             )
#             return

#     if bom_count > 0:
#         time.sleep(0.5)

#     # ── STEP 5: Delete Item ───────────────────────────────────────────────────
#     try:
#         frappe.delete_doc("Item", item_code, force=1)
#         frappe.db.commit()
#     except Exception as e:
#         errors.append(
#             f"<b>{item_code}</b>: Unexpected error during item deletion — {str(e)}"
#         )


# def handle_cancel(doc, method):
#     errors = []

#     for row in doc.missing_variants:
#         item_code = row.created_item_code
#         if not item_code:
#             continue
#         validate_and_delete(item_code, errors)

#     # ── BUG FIX: error_list was missing from msg ──────────────────────────────
#     if errors:
#         error_list = "".join(
#             f"<li style='margin-bottom:10px'>{e}</li>" for e in errors
#         )
#         frappe.throw(
#             msg=f"""
#                 <ul style='margin-top:8px;line-height:1.8'>{error_list}</ul>
#                 <p style='margin-top:10px;color:#856404;background:#fff3cd;
#                            padding:8px 12px;border-radius:4px;'>
#                     ⚠️ Resolve the above links first, then try cancelling again.
#                 </p>
#             """,
#             title="Cannot Cancel — Linked Documents Exist",
#             exc=frappe.ValidationError
#         )