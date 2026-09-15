import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatApiError } from "@/lib/api";

export default function RegistrationForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formData, setFormData] = useState({
    parent_name: "",
    child_name: "",
    child_dob: "",
    child_class: "",
    child_experience: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        contact_number: `${countryCode} ${phoneNumber}`
      };
      await api.post("/public/enroll", payload);
      setSuccess(true);
      toast.success("Registration submitted successfully!");
    } catch (error) {
      console.error(error);
      toast.error(formatApiError(error) || "An error occurred while submitting.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg text-center p-8">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <CardTitle className="text-2xl mb-2">Registration Complete</CardTitle>
          <CardDescription className="text-base">
            Thank you for registering! We have received your details and will get in touch with you shortly.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Student Onboarding</h1>
        <p className="mt-2 text-sm text-gray-600">Please provide a few details to get started.</p>
      </div>
      
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Registration Form</CardTitle>
          <CardDescription>All fields are required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Parent Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="parent_name">Parent's Full Name</Label>
                <Input 
                  id="parent_name"
                  name="parent_name" 
                  placeholder="e.g. John Doe"
                  value={formData.parent_name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Contact Number</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+91">🇮🇳 +91 (IN)</SelectItem>
                      <SelectItem value="+1">🇺🇸 +1 (US/CA)</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44 (UK)</SelectItem>
                      <SelectItem value="+61">🇦🇺 +61 (AU)</SelectItem>
                      <SelectItem value="+971">🇦🇪 +971 (AE)</SelectItem>
                      <SelectItem value="+65">🇸🇬 +65 (SG)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    id="phoneNumber"
                    name="phoneNumber" 
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    required 
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <hr className="my-6" />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Child Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="child_name">Child's Full Name</Label>
                <Input 
                  id="child_name"
                  name="child_name" 
                  placeholder="e.g. Alex Doe"
                  value={formData.child_name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="child_dob">Date of Birth</Label>
                  <Input 
                    id="child_dob"
                    name="child_dob" 
                    type="date"
                    value={formData.child_dob} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="child_class">Class / Grade</Label>
                  <Input 
                    id="child_class"
                    name="child_class" 
                    placeholder="e.g. Grade 4"
                    value={formData.child_class} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-base font-semibold">Child's Chess Experience</Label>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="exp_beginner"
                    name="child_experience"
                    value="Very Beginner"
                    checked={formData.child_experience === "Very Beginner"}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    required
                  />
                  <Label htmlFor="exp_beginner" className="font-normal">
                    <span className="block font-medium">Very Beginner</span>
                    <span className="block text-sm text-gray-500">Doesn't know the rules yet</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="exp_intermediate"
                    name="child_experience"
                    value="Intermediate"
                    checked={formData.child_experience === "Intermediate"}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <Label htmlFor="exp_intermediate" className="font-normal">
                    <span className="block font-medium">Intermediate</span>
                    <span className="block text-sm text-gray-500">Knows rules, plays with friends/family</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="exp_advanced"
                    name="child_experience"
                    value="Advanced"
                    checked={formData.child_experience === "Advanced"}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <Label htmlFor="exp_advanced" className="font-normal">
                    <span className="block font-medium">Advanced</span>
                    <span className="block text-sm text-gray-500">Regularly goes to tournaments</span>
                  </Label>
                </div>
              </div>
            </div>
            
            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? "Submitting..." : "Submit Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
