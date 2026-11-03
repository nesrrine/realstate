-- Migration: Add Property.googleMapsUrl
-- Allows storing a custom Google Maps link for a property

ALTER TABLE "properties" ADD COLUMN "googleMapsUrl" TEXT;