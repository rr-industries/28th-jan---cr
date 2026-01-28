"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  FolderPlus,
  LoaderCircle,
  Upload,
  X,
  Link,
  HardDrive,
  Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type GalleryCategory = {
  id: string;
  name: string;
};

type GalleryImage = {
  id: string;
  image_url: string;
  alt_text: string;
  category_id: string;
  category?: GalleryCategory;
};

export default function AdminGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const [showAddImageDialog, setShowAddImageDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  
  const [newImage, setNewImage] = useState({ url: "", alt: "", categoryId: "" });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: catData } = await supabase
      .from("gallery_categories")
      .select("*")
      .order("name");
    
    const { data: imgData } = await supabase
      .from("gallery_images")
      .select(`*, category:gallery_categories(*)`)
      .order("created_at", { ascending: false });

    if (catData) setCategories(catData);
    if (imgData) setImages(imgData);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      }

      const { data: publicUrl } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl.publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  };

  const handleAddImage = async () => {
    setUploading(true);
    setSaving(true);
    
    try {
      let imageUrl = newImage.url;

      if (uploadMethod === "file" && selectedFile) {
        const uploadedUrl = await uploadFileToStorage(selectedFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          toast.error("Failed to upload image");
          return;
        }
      }

      if (!imageUrl.trim()) {
        toast.error("Please enter image URL or upload a file");
        return;
      }

      const { error } = await supabase
        .from("gallery_images")
        .insert({
          image_url: imageUrl,
          alt_text: newImage.alt || "Gallery image",
          category_id: newImage.categoryId || null
        });

      if (error) throw error;

      toast.success("Image added successfully!");
      setShowAddImageDialog(false);
      setNewImage({ url: "", alt: "", categoryId: "" });
      setSelectedFile(null);
      setUploadMethod("url");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add image");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter category name");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("gallery_categories")
        .insert({ name: newCategoryName });

      if (error) throw error;

      toast.success("Category added successfully!");
      setShowAddCategoryDialog(false);
      setNewCategoryName("");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add category");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      const { error } = await supabase
        .from("gallery_images")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Image deleted successfully");
      setDeleteImageId(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("gallery_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Category deleted successfully");
      setDeleteCategoryId(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete category. Make sure no images are using this category.");
    }
  };

  const filteredImages = selectedCategory === "all" 
    ? images 
    : images.filter(img => img.category_id === selectedCategory);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            Gallery Management
          </h1>
          <p className="text-muted-foreground">Manage photos and categories</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddCategoryDialog(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
          <Button onClick={() => setShowAddImageDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Image
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Manage gallery categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                className="flex items-center gap-2 rounded-full bg-muted px-4 py-2"
              >
                <span className="font-medium">{cat.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({images.filter(i => i.category_id === cat.id).length})
                </span>
                <button 
                  onClick={() => setDeleteCategoryId(cat.id)}
                  className="ml-1 rounded-full p-1 hover:bg-red-100 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground">No categories yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Label>Filter by category:</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredImages.length} images
        </span>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filteredImages.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
            <img 
              src={img.image_url} 
              alt={img.alt_text} 
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <span className="text-white text-xs font-medium px-2 py-1 bg-black/50 rounded">
                {img.category?.name || "Uncategorized"}
              </span>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => setDeleteImageId(img.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        ))}

        {filteredImages.length === 0 && (
          <div className="col-span-full rounded-2xl border-2 border-dashed p-12 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">No images in this category</p>
            <Button 
              onClick={() => setShowAddImageDialog(true)} 
              className="mt-4"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Image
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showAddImageDialog} onOpenChange={setShowAddImageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Add New Image
            </DialogTitle>
            <DialogDescription>
              Upload an image from your device or enter a URL
            </DialogDescription>
          </DialogHeader>

          <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as "url" | "file")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Image URL
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Upload File
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL *</Label>
                <Input 
                  id="imageUrl"
                  value={newImage.url}
                  onChange={(e) => setNewImage(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a direct link to an image from the web or Google Drive (make sure it's publicly accessible)
                </p>
              </div>
            </TabsContent>

            <TabsContent value="file" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Upload from Device</Label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                    selectedFile ? "border-green-300 bg-green-50" : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="h-20 w-20 mx-auto rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={URL.createObjectURL(selectedFile)} 
                          alt="Preview" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" />
                      <p className="mt-2 text-sm font-medium">Click to upload image</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="altText">Alt Text (description)</Label>
              <Input 
                id="altText"
                value={newImage.alt}
                onChange={(e) => setNewImage(prev => ({ ...prev, alt: e.target.value }))}
                placeholder="Describe the image"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={newImage.categoryId} 
                onValueChange={(value) => setNewImage(prev => ({ ...prev, categoryId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(newImage.url || selectedFile) && uploadMethod === "url" && newImage.url && (
              <div className="rounded-xl overflow-hidden border">
                <img 
                  src={newImage.url} 
                  alt="Preview" 
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x200?text=Invalid+URL";
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowAddImageDialog(false);
              setSelectedFile(null);
              setNewImage({ url: "", alt: "", categoryId: "" });
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddImage} disabled={saving || uploading}>
              {saving || uploading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Uploading..." : "Adding..."}
                </>
              ) : (
                "Add Image"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              Add New Category
            </DialogTitle>
            <DialogDescription>
              Create a new gallery category
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input 
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Coffee, Food, Ambiance"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Category"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteImageId} onOpenChange={() => setDeleteImageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the image from the gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteImageId && handleDeleteImage(deleteImageId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the category. Images in this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteCategoryId && handleDeleteCategory(deleteCategoryId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
