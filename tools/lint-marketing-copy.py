#!/usr/bin/env python3
"""
Lint FeraSetu marketing copy using SlopMonster.
Runs as a development verification tool.
"""
import subprocess
import os
import sys

landing_copy = """# FeraSetu — Your business is yours. The internet should be too.

INDEPENDENT COMMERCE | 0% Commission

Your business is yours. The internet should be too.

Run your own branded online store, receive direct customer orders, and keep what you make after payment processing. 0% FeraSetu platform commission.

Bring my business online. See how it works.
Permanent Free Plan. 14-day trial. No credit card to start. 0% FeraSetu platform commission.

Direct customer connection. FeraSetu does not run marketplace ads or divert your buyers. 0% FeraSetu Platform Commission.

## Three pillars of digital independence.

Infrastructure designed so you never have to trade your identity, your customer list, or your margins to be on the internet.

### Your Name and Domain
Your store runs under your own business name, using your permanent store address or your own custom domain. No third-party ads, no search ranking games, and no competing shops pushed alongside your goods.

### Direct Customer Relationships
When someone orders from your storefront, you receive their direct phone number and full order history. We never hide buyer details or use your customer list to sell ads.

### Your Money: 0% Platform Commission
You pay a predictable subscription for software that keeps running. We do not take a percentage cut of your sales. Every payment settles directly into your bank account through your chosen gateway.

## One connected workflow from physical shop to returning customer.

No messy plugins. No middleman holding your inventory hostage. Four clear stages connect your business to the web.

### 01 Get Online
Add products with photos and prices right from your phone. Your store address is live right away with zero server setup.
Fast cloud hosting with automatic SSL and clean mobile layout.
Permanent store link or your own custom domain.

### 02 Get Orders
Customers open your link from WhatsApp, printed QR codes, or social channels. They browse current inventory, choose items, and send an organized order.
Structured shopping cart avoids lost chat messages and missed details.
Buyers order directly without downloading an app or creating an account.

### 03 Get Paid
Payments process directly through your own payment gateway. FeraSetu charges 0% platform commission, and payouts settle straight to your bank account.
Direct settlement: FeraSetu does not hold or delay your payouts.
Zero commission surcharge from FeraSetu on any order.

### 04 Complete the Order
Pack the order from your shelves. Customers receive direct status updates and receipts, while their contact details stay in your own customer list.
Direct customer phone numbers and order history stay in your own records.
Export your customer records and product catalog anytime.

## You already built the hard part.

A physical store takes real work: finding inventory, earning neighbor trust, and opening the door every single morning. Putting that store online should be dependable software, not a toll booth taking 15% to 25% of your turnover or walling off your customers. We built FeraSetu so shopkeepers can sell online without giving away their business.

### 1. Marketplaces turn independent shops into packing stations.
Marketplaces promised new buyers but quietly turned local merchants into replaceable packing stations. When a platform hides customer contacts from you, you are working for their catalog instead of building your own goodwill. FeraSetu gives you an independent storefront so your customers stay yours.

### 2. Software is an operating tool, not an equity partner.
You pay a clear subscription. If your shop has a record-breaking weekend, your software cost stays unchanged. FeraSetu takes 0% platform commission on your sales.

### 3. Customer records are your shop's long-term asset.
When repeat buyers order, their numbers and purchase records stay in your private dashboard. You can download your entire customer list whenever you want.

## Flat software vs. percentage tolls.

Compare the economics of direct ownership against traditional aggregators and generic website builders.
Platform Commission: 0% (Flat subscription only).
Customer Data: Direct access (buyer phone numbers and order history stay in your records).
Storefront Identity: Your brand and products only. Zero competitor ads.
Payouts: Direct settlement into your business bank account.
Portability: Direct CSV export of product catalogs and customer records.

Standard merchant gateway processing fees apply directly from your payment processor. FeraSetu charges 0% commission surcharge.

## Simple software subscription. 0% sales commission.

FeraSetu charges a predictable subscription. We charge 0% platform commission on your sales.

## Bring your business online. Keep it yours.

Direct customer orders. 0% FeraSetu platform commission. Your own branded web address.
"""

pricing_copy = """# FeraSetu Pricing

Simple, Honest Pricing.
Start free. Upgrade when you need more.
Put your shop online today for ₹0. Upgrade as your catalog grows. Zero commissions, no hidden fees.

## Outcomes
Sell without being there all day. Your store takes orders 24 hours a day, even when you are at home, resting, or busy with other work. Customers browse your catalog and place orders, while you handle fulfillment.

Know what is actually making money. See which products sell quickly, which stay on shelves, and what your daily profit looks like in one clear dashboard.

Keep orders and customer records organized. When orders come in, you get a clean centralized list instead of scattered chat messages. Update statuses, print invoices, and monitor inventory from one place.

Store assistant powered by your own catalog data. FeraSetu AI reads your real store records to answer questions like what to restock, generate product details, or plan promotions around your actual sales patterns.
"""

storefront_copy = """# Live Merchant Storefronts

LIVE MERCHANT CONDUITS

Real storefronts. Independent ownership.

Explore how independent shops and local makers take orders directly with zero platform commissions.

Sharma General Store
Daily Kirana & Groceries
Neighborhood daily essentials & packaged goods
0% Platform Cut
Aashirvaad Shudh Chakki Atta 5kg: ₹245.
Fortune Sunlite Sunflower Oil 1L: ₹135.
Tata Salt Vaccum Evaporated 1kg: ₹28.
Instant UPI Settlement to HDFC Bank.

SweetCraft Bakehouse
Fresh Cakes & Artisan Pastries
Custom celebration cakes & sourdough bakes
Direct WhatsApp Link
Belgian Truffle Birthday Cake 1kg: ₹950.
Wildflower Honey Sourdough Loaf: ₹220.
Almond Butter Croissant Box of 4: ₹420.
Direct Card Checkout via Cashfree.

Chanderi Weaves
Handloom & Indian Ethnic Wear
Authentic hand-woven sarees and dupattas
Owned Customer List
Pure Silk Zari Border Chanderi Saree: ₹4,800.
Hand-block Printed Cotton Dupatta: ₹1,250.
Tussar Silk Festive Kurta Set: ₹3,400.
Unmasked Buyer Contact Records.

GreenRoot Farms
Organic Harvest & Fresh Produce
Farm-fresh harvest baskets delivered weekly
Direct Conduit Active
Weekly Farm Harvest Veggie Box 7kg: ₹550.
Cold-pressed Mustard Oil 1L Wood Churned: ₹260.
Wild Forest Raw Honey 500g: ₹380.
0% Middleman Escrow Holds.

Monsoon Coffee Roasters
Specialty Arabica & Filter Blends
Single-origin estate beans roasted to order
Custom Domain Connected
Chikmagalur Malabar AAA Whole Bean 250g: ₹460.
Traditional South Indian Filter Blend 500g: ₹390.
Cold Brew Blend Medium-Dark 250g: ₹480.
Export buyer records anytime.

Every storefront runs on its own web address. Customers buy directly without marketplace rerouting.
"""

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    deslop_script = os.path.join(root_dir, 'tools', 'slopmonster', 'tools', 'deslop.py')

    temp_landing = os.path.join(root_dir, 'landing_copy_audit.md')
    temp_pricing = os.path.join(root_dir, 'pricing_copy_audit.md')
    temp_storefront = os.path.join(root_dir, 'storefront_copy_audit.md')

    try:
        with open(temp_landing, 'w', encoding='utf-8') as f:
            f.write(landing_copy)
        with open(temp_pricing, 'w', encoding='utf-8') as f:
            f.write(pricing_copy)
        with open(temp_storefront, 'w', encoding='utf-8') as f:
            f.write(storefront_copy)

        print("=== SLOPMONSTER AUDIT: LANDING PAGE COPY ===")
        res1 = subprocess.run([sys.executable, deslop_script, temp_landing], capture_output=True, text=True)
        print(res1.stdout)
        if res1.stderr:
            print(res1.stderr)

        print("=== SLOPMONSTER AUDIT: PRICING PAGE COPY ===")
        res2 = subprocess.run([sys.executable, deslop_script, temp_pricing], capture_output=True, text=True)
        print(res2.stdout)
        if res2.stderr:
            print(res2.stderr)

        print("=== SLOPMONSTER AUDIT: STOREFRONT GALLERY COPY ===")
        res3 = subprocess.run([sys.executable, deslop_script, temp_storefront], capture_output=True, text=True)
        print(res3.stdout)
        if res3.stderr:
            print(res3.stderr)

        if res1.returncode != 0 or res2.returncode != 0 or res3.returncode != 0:
            print("ERROR: Copy failed SlopMonster lint checks!", file=sys.stderr)
            sys.exit(1)

        print("SUCCESS: All marketing copy scored 5/5 CLEAN!")
    finally:
        if os.path.exists(temp_landing):
            os.remove(temp_landing)
        if os.path.exists(temp_pricing):
            os.remove(temp_pricing)
        if os.path.exists(temp_storefront):
            os.remove(temp_storefront)

if __name__ == '__main__':
    main()
